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
}

func main() {
	cfg := parseFlags()
	if err := run(cfg); err != nil {
		fmt.Fprintf(os.Stderr, "\n❌ %v\n", err)
		os.Exit(1)
	}
}

func parseFlags() config {
	var cfg config
	flag.StringVar(&cfg.appDir, "app", "", "folder with the built app (index.html); default: ../app next to this program")
	flag.StringVar(&cfg.dataDir, "data", "", "folder for the local certificate authority; default: user config dir/WindowBlaster")
	flag.IntVar(&cfg.httpPort, "http", 8080, "HTTP port (Mac browser, phone setup page)")
	flag.IntVar(&cfg.httpsPort, "https", 8443, "HTTPS port (game on the phone)")
	flag.BoolVar(&cfg.open, "open", true, "open the connect page in the Mac's browser")
	flag.BoolVar(&cfg.quiet, "quiet", false, "no QR code in the terminal")
	showVersion := flag.Bool("version", false, "print version and exit")
	flag.Parse()
	if *showVersion {
		fmt.Println(version)
		os.Exit(0)
	}
	return cfg
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

	httpLn, httpPort, err := listenFirst(cfg.httpPort)
	if err != nil {
		return err
	}
	httpsLn, httpsPort, err := listenFirst(cfg.httpsPort)
	if err != nil {
		return err
	}

	s := newServer(appDir, ca, httpPort, httpsPort)
	httpSrv := &http.Server{Handler: s.handler(false), ReadHeaderTimeout: 15 * time.Second}
	httpsSrv := &http.Server{Handler: s.handler(true), ReadHeaderTimeout: 15 * time.Second, TLSConfig: ca.tlsConfig(), ErrorLog: quietTLSLog()}

	errc := make(chan error, 2)
	go func() { errc <- httpSrv.Serve(httpLn) }()
	go func() { errc <- httpsSrv.ServeTLS(httpsLn, "", "") }()

	printBanner(s, created, dataDir, cfg.quiet)
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
