// Window Blaster local server for macOS (and Linux, for tests).
//
// Serves the built web app to the Mac's browser (http://localhost – a secure
// context, no certificate warning) and to phones on the same Wi-Fi over HTTPS
// with a small local certificate authority. The CA lives in the user's config
// directory (~/Library/Application Support/WindowBlaster on macOS), so updating
// the game folder never forces the phone to trust a new certificate.
//
// It also serves a "connect" page for the Mac (QR code + live checklist) and a
// guided page for the phone (/handy) that installs the certificate and checks
// that HTTPS is trusted before sending the player to the game.
package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

var version = "dev"

type config struct {
	appDir    string
	dataDir   string
	httpPort  int
	httpsPort int
	open      bool
	quiet     bool
	// publicURL overrides wb-meta.json's publicUrl when publicURLSet (an empty value disables it).
	publicURL    string
	publicURLSet bool
}

func main() {
	cfg, showVersion, err := parseFlags(os.Args[1:])
	if err != nil {
		os.Exit(2) // the flag package already printed the problem and the usage
	}
	if showVersion {
		fmt.Println(version)
		return
	}
	if err := run(cfg); err != nil {
		fmt.Fprintf(os.Stderr, "\n❌ %v\n", err)
		os.Exit(1)
	}
}

func parseFlags(args []string) (cfg config, showVersion bool, err error) {
	fs := flag.NewFlagSet("windowblaster", flag.ContinueOnError)
	fs.StringVar(&cfg.appDir, "app", "", "folder with the built app (index.html); default: ../app next to this program")
	fs.StringVar(&cfg.dataDir, "data", "", "folder for the local certificate authority; default: user config dir/WindowBlaster")
	fs.IntVar(&cfg.httpPort, "http", 8080, "HTTP port (Mac browser, phone setup page)")
	fs.IntVar(&cfg.httpsPort, "https", 8443, "HTTPS port (game on the phone)")
	fs.BoolVar(&cfg.open, "open", true, "open the connect page in the Mac's browser")
	fs.BoolVar(&cfg.quiet, "quiet", false, "no QR code in the terminal")
	fs.StringVar(&cfg.publicURL, "public-url", "", "online address of the game (default: publicUrl from the app's wb-meta.json; empty disables)")
	fs.BoolVar(&showVersion, "version", false, "print version and exit")
	if err = fs.Parse(args); err != nil {
		return cfg, false, err
	}
	fs.Visit(func(f *flag.Flag) {
		if f.Name == "public-url" {
			cfg.publicURLSet = true
		}
	})
	return cfg, showVersion, nil
}

func run(cfg config) error {
	appDir, err := findAppDir(cfg.appDir)
	if err != nil {
		return err
	}
	dataDir, err := findDataDir(cfg.dataDir)
	if err != nil {
		return err
	}
	ca, created, err := loadOrCreateCA(dataDir)
	if err != nil {
		return fmt.Errorf("Zertifikat konnte nicht angelegt werden (%s): %w", dataDir, err)
	}

	// A Window Blaster server from an earlier start still running (e.g. another Terminal window)?
	// Same folder and build → reuse it. Another version → ask it to stop and take over the same
	// ports, never move to other ports – the phone's game address includes the port.
	if other, ok := alreadyRunning(cfg.httpsPort); ok {
		if other.AppDir == appDir && other.Build == readBuild(appDir) {
			fmt.Printf("\n✅ Window Blaster läuft bereits (in einem anderen Terminal-Fenster).\n   Verbindungsseite: http://localhost:%d/verbinden\n", other.HTTPPort)
			if cfg.open {
				openBrowser(fmt.Sprintf("http://localhost:%d/verbinden", other.HTTPPort))
			}
			return nil
		}
		fmt.Println("\n🔄 Eine andere Window-Blaster-Version läuft noch in einem anderen Terminal-Fenster – sie wird beendet, die neue startet.")
		if !stopOther(cfg.httpsPort, other.HTTPPort) {
			return fmt.Errorf("die alte Version läuft noch. Bitte das andere Terminal-Fenster schließen (im Terminal: ⌘ + Q) und diese Startdatei erneut starten")
		}
	}
	freeOldServers(cfg.httpPort, cfg.httpsPort)
	httpLn, httpPort, err := listenFirst(cfg.httpPort)
	if err != nil {
		return err
	}
	httpsLn, httpsPort, err := listenFirst(cfg.httpsPort)
	if err != nil {
		return err
	}
	if httpPort != cfg.httpPort {
		fmt.Printf("⚠️  Port %d ist belegt – die Mac-Adressen lauten diesmal http://localhost:%d/…\n", cfg.httpPort, httpPort)
	}
	if httpsPort != cfg.httpsPort {
		fmt.Printf("⚠️  Port %d ist von einem anderen Programm belegt – nutze %d. Ein Handy, das schon eingerichtet war, braucht dann die neue Adresse.\n", cfg.httpsPort, httpsPort)
	}

	s := newServer(appDir, ca, httpPort, httpsPort)
	if cfg.publicURLSet {
		s.publicURL = normalizePublicURL(cfg.publicURL)
		if s.publicURL == "" && strings.TrimSpace(cfg.publicURL) != "" {
			fmt.Printf("⚠️  --public-url %q ist keine gültige http(s)-Adresse – Online-Version ausgeblendet.\n", cfg.publicURL)
		}
	}
	// No WriteTimeout: a phone on slow Wi-Fi needs minutes for the 30 MB of detection files.
	httpSrv := &http.Server{Handler: s.handler(false), ReadHeaderTimeout: 15 * time.Second, ReadTimeout: time.Minute, IdleTimeout: 2 * time.Minute}
	httpsSrv := &http.Server{Handler: s.handler(true), ReadHeaderTimeout: 15 * time.Second, ReadTimeout: time.Minute, IdleTimeout: 2 * time.Minute, TLSConfig: ca.tlsConfig(), ErrorLog: quietTLSLog()}

	errc := make(chan error, 2)
	go func() { errc <- httpSrv.Serve(httpLn) }()
	go func() { errc <- httpsSrv.ServeTLS(httpsLn, "", "") }()

	keepAwake()
	printBanner(s, created, dataDir, cfg.quiet)
	// The Mac may switch networks while the user sets up the phone (Wi-Fi → Internet Sharing):
	// print the new setup address and QR code instead of leaving a stale one in the terminal.
	stopWatch := make(chan struct{})
	defer close(stopWatch)
	go newAddrWatcher(localIPv4s, os.Stdout, httpPort, cfg.quiet).run(stopWatch, 3*time.Second)
	if cfg.open {
		go func() {
			time.Sleep(700 * time.Millisecond)
			openBrowser(fmt.Sprintf("http://localhost:%d/verbinden", httpPort))
		}()
	}

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM, syscall.SIGHUP)
	select {
	case <-sig:
		fmt.Println("\n👋 Server wird beendet …")
	case <-s.quit:
		fmt.Println("\n🔄 Eine neuere Window-Blaster-Version wurde gestartet – dieses Fenster kann geschlossen werden.")
	case err := <-errc:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("Server-Fehler: %w", err)
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = httpSrv.Shutdown(ctx)
	_ = httpsSrv.Shutdown(ctx)
	return nil
}

// findAppDir locates the built app: explicit flag, ../app next to the binary, ./app.
func findAppDir(flagValue string) (string, error) {
	var candidates []string
	if flagValue != "" {
		candidates = append(candidates, flagValue)
	} else {
		if exe, err := os.Executable(); err == nil {
			if real, err := filepath.EvalSymlinks(exe); err == nil {
				exe = real
			}
			d := filepath.Dir(exe)
			candidates = append(candidates, filepath.Join(d, "..", "app"), filepath.Join(d, "app"))
		}
		if wd, err := os.Getwd(); err == nil {
			candidates = append(candidates, filepath.Join(wd, "app"))
		}
	}
	for _, c := range candidates {
		abs, err := filepath.Abs(c)
		if err != nil {
			continue
		}
		if st, err := os.Stat(filepath.Join(abs, "index.html")); err == nil && !st.IsDir() {
			return abs, nil
		}
	}
	return "", fmt.Errorf("Spiel-Ordner „app“ nicht gefunden (gesucht: %s).\n   Bitte den ganzen Ordner WindowBlaster entpacken und die Startdatei darin benutzen.", strings.Join(candidates, ", "))
}

func findDataDir(flagValue string) (string, error) {
	dir := flagValue
	if dir == "" {
		base, err := os.UserConfigDir()
		if err != nil || base == "" {
			home, _ := os.UserHomeDir()
			base = filepath.Join(home, ".config")
		}
		dir = filepath.Join(base, "WindowBlaster")
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", fmt.Errorf("Datenordner %s nicht beschreibbar: %w", dir, err)
	}
	return dir, nil
}

// listenFirst binds to the first free port in [start, start+20).
func listenFirst(start int) (net.Listener, int, error) {
	var lastErr error
	for p := start; p < start+20; p++ {
		ln, err := net.Listen("tcp", fmt.Sprintf(":%d", p))
		if err == nil {
			return ln, p, nil
		}
		lastErr = err
	}
	return nil, 0, fmt.Errorf("kein freier Port ab %d gefunden: %v", start, lastErr)
}

func localClient() *http.Client {
	return &http.Client{
		Timeout:   1500 * time.Millisecond,
		Transport: &http.Transport{Proxy: nil, TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}, //nolint:gosec // local self-check only
	}
}

// alreadyRunning asks the HTTPS port whether a Window Blaster server answers there
// and returns its status (with folder and build, as the Mac's own page sees it).
func alreadyRunning(httpsPort int) (statusDoc, bool) {
	var doc statusDoc
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://127.0.0.1:%d/wb-status", httpsPort), nil)
	req.Host = "localhost"
	res, err := localClient().Do(req)
	if err != nil {
		return doc, false
	}
	defer res.Body.Close()
	if json.NewDecoder(res.Body).Decode(&doc) != nil || !doc.OK || doc.HTTPPort == 0 {
		return doc, false
	}
	return doc, true
}

// stopOther asks the running instance to quit and waits until both ports are free.
func stopOther(httpsPort, httpPort int) bool {
	req, _ := http.NewRequest("POST", fmt.Sprintf("https://127.0.0.1:%d/wb-quit", httpsPort), nil)
	req.Host = "localhost"
	res, err := localClient().Do(req)
	if err != nil {
		return false
	}
	res.Body.Close()
	if res.StatusCode != http.StatusNoContent {
		return false // an older version without /wb-quit
	}
	for i := 0; i < 50; i++ {
		if portFree(httpsPort) && portFree(httpPort) {
			return true
		}
		time.Sleep(100 * time.Millisecond)
	}
	return false
}

func portFree(p int) bool {
	ln, err := net.Listen("tcp", fmt.Sprintf(":%d", p))
	if err != nil {
		return false
	}
	ln.Close()
	return true
}

// keepAwake prevents idle sleep on macOS while the server runs (the user is busy on
// the phone for minutes); caffeinate exits by itself when this process ends.
func keepAwake() {
	if runtime.GOOS != "darwin" {
		return
	}
	cmd := exec.Command("caffeinate", "-i", "-w", fmt.Sprint(os.Getpid()))
	if cmd.Start() == nil {
		go func() { _ = cmd.Wait() }()
	}
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	default:
		return
	}
	cmd.Stdout = nil
	cmd.Stderr = nil
	_ = cmd.Start()
	go func() { _ = cmd.Wait() }()
}
