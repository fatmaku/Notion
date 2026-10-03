package main

import (
	"embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html/template"
	"net"
	"net/http"
	"os"
	"path"
	"strings"
	"sync"
	"time"
)

//go:embed web/*.html
var webFS embed.FS

var pages = template.Must(template.New("").ParseFS(webFS, "web/*.html"))

type phone struct {
	IP        string    `json:"ip"`
	Device    string    `json:"device"`
	FirstSeen time.Time `json:"firstSeen"`
	Cert      bool      `json:"cert"`
	HTTPS     bool      `json:"https"`
	Game      bool      `json:"game"`
	Offline   bool      `json:"offline"`
}

type server struct {
	appDir    string
	ca        *localCA
	httpPort  int
	httpsPort int
	started   time.Time

	mu     sync.Mutex
	phones map[string]*phone
	order  []string
}

func newServer(appDir string, ca *localCA, httpPort, httpsPort int) *server {
	return &server{appDir: appDir, ca: ca, httpPort: httpPort, httpsPort: httpsPort, started: time.Now(), phones: map[string]*phone{}}
}

func (s *server) handler(isTLS bool) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/verbinden", s.connectPage)
	mux.HandleFunc("/handy", s.phonePage)
	mux.HandleFunc("/anleitung", s.guidePage)
	mux.HandleFunc("/zertifikat.crt", s.certDER)
	mux.HandleFunc("/zertifikat.mobileconfig", s.mobileconfig)
	mux.HandleFunc("/wb-status", s.status)
	mux.Handle("/", s.appHandler())
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.track(r, isTLS)
		mux.ServeHTTP(w, r)
	})
}

// ---------------------------------------------------------------- app files

var mimeTypes = map[string]string{
	".html":        "text/html; charset=utf-8",
	".js":          "text/javascript; charset=utf-8",
	".mjs":         "text/javascript; charset=utf-8",
	".css":         "text/css; charset=utf-8",
	".json":        "application/json",
	".webmanifest": "application/manifest+json",
	".wasm":        "application/wasm",
	".tflite":      "application/octet-stream",
	".svg":         "image/svg+xml",
	".png":         "image/png",
	".ico":         "image/x-icon",
	".txt":         "text/plain; charset=utf-8",
}

func (s *server) appHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := path.Clean(r.URL.Path)
		if r.URL.Path != "/" && strings.HasSuffix(r.URL.Path, "/") {
			http.NotFound(w, r) // no directory listings
			return
		}
		if ct, ok := mimeTypes[strings.ToLower(path.Ext(p))]; ok {
			w.Header().Set("Content-Type", ct)
		}
		if strings.HasPrefix(p, "/mediapipe/") || strings.HasPrefix(p, "/models/") || strings.HasPrefix(p, "/assets/") {
			w.Header().Set("Cache-Control", "public, max-age=604800")
		} else {
			// index.html, sw.js, precache.json …: always revalidate so updates arrive
			w.Header().Set("Cache-Control", "no-cache")
		}
		// os.Root keeps symlinks from reaching outside the app folder. Opened per request,
		// so a replaced app folder (update while running) is picked up instead of a stale handle.
		root, err := os.OpenRoot(s.appDir)
		if err != nil {
			http.Error(w, "Spiel-Ordner nicht lesbar", http.StatusInternalServerError)
			return
		}
		defer root.Close()
		http.FileServerFS(root.FS()).ServeHTTP(w, r)
	})
}

// ---------------------------------------------------------------- tracking

func remoteIP(r *http.Request) net.IP {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return nil
	}
	return net.ParseIP(host)
}

func deviceFrom(ua string) string {
	switch {
	case strings.Contains(ua, "iPhone"):
		return "iPhone"
	case strings.Contains(ua, "iPad"):
		return "iPad"
	case strings.Contains(ua, "Android"):
		return "Android"
	case strings.Contains(ua, "Macintosh"):
		return "Mac/iPad"
	default:
		return "Gerät"
	}
}

func (s *server) track(r *http.Request, isTLS bool) {
	ip := remoteIP(r)
	if ip == nil || ip.IsLoopback() {
		return
	}
	key := ip.String()
	p := path.Clean(r.URL.Path)
	s.mu.Lock()
	defer s.mu.Unlock()
	ph, ok := s.phones[key]
	if !ok {
		if len(s.phones) >= maxPhones {
			return // a crowded or hostile network must not flood memory or the terminal
		}
		ph = &phone{IP: key, Device: deviceFrom(r.UserAgent()), FirstSeen: time.Now()}
		s.phones[key] = ph
		s.order = append(s.order, key)
		event("📱", fmt.Sprintf("%s verbunden (%s)", ph.Device, key))
	}
	if p == "/zertifikat.crt" || p == "/zertifikat.mobileconfig" {
		if !ph.Cert {
			ph.Cert = true
			event("📄", fmt.Sprintf("%s hat das Zertifikat geladen – jetzt am Handy installieren und vertrauen", ph.Device))
		}
	}
	// Trust is only proven by requests a browser makes without a certificate warning:
	// the /handy probe (fetch fails on untrusted certs) or the service-worker script
	// (browsers refuse to register a worker on a clicked-through certificate).
	trusted := (p == "/wb-status" && r.URL.Query().Get("probe") == "1") || (p == "/sw.js" && r.Header.Get("Service-Worker") == "script")
	if isTLS && trusted && !ph.HTTPS {
		ph.HTTPS = true
		event("🔒", fmt.Sprintf("%s vertraut dem Mac (sichere Verbindung ok)", ph.Device))
	}
	if isTLS && (p == "/" || p == "/index.html") && !ph.Game {
		ph.Game = true
		event("🎮", fmt.Sprintf("Spiel auf %s geöffnet", ph.Device))
	}
	if isTLS && strings.HasPrefix(p, "/models/") && !ph.Offline {
		ph.Offline = true
		event("📦", fmt.Sprintf("%s lädt die Fahrzeug-Erkennung (für offline) …", ph.Device))
	}
}

const maxPhones = 16

func event(icon, msg string) {
	fmt.Printf("%s %s  %s\n", time.Now().Format("15:04:05"), icon, msg)
}

// ---------------------------------------------------------------- endpoints

type statusDoc struct {
	OK        bool        `json:"ok"`
	Secure    bool        `json:"secure"`
	Version   string      `json:"version"`
	HTTPPort  int         `json:"httpPort"`
	HTTPSPort int         `json:"httpsPort"`
	Addrs     []localAddr `json:"addrs"`
	Phones    []phone     `json:"phones"`
}

func (s *server) status(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json")
	doc := statusDoc{OK: true, Secure: r.TLS != nil, Version: version, HTTPPort: s.httpPort, HTTPSPort: s.httpsPort}
	if s.isLocalPage(r) {
		// details only for the Mac itself
		doc.Addrs = localIPv4s()
		s.mu.Lock()
		for _, k := range s.order {
			doc.Phones = append(doc.Phones, *s.phones[k])
		}
		s.mu.Unlock()
	} else {
		// minimal document: the phone page probes it cross-origin
		w.Header().Set("Access-Control-Allow-Origin", "*")
	}
	_ = json.NewEncoder(w).Encode(doc)
}

// isLocalPage reports a request from the Mac's own connect page: loopback client,
// localhost Host header (no DNS rebinding) and no foreign Origin.
func (s *server) isLocalPage(r *http.Request) bool {
	ip := remoteIP(r)
	if ip == nil || !ip.IsLoopback() {
		return false
	}
	host := r.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	if host != "localhost" && host != "127.0.0.1" && host != "::1" {
		return false
	}
	origin := r.Header.Get("Origin")
	return origin == "" || origin == fmt.Sprintf("http://localhost:%d", s.httpPort) || origin == fmt.Sprintf("http://127.0.0.1:%d", s.httpPort)
}

func (s *server) certDER(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/x-x509-ca-cert")
	w.Header().Set("Content-Disposition", `attachment; filename="WindowBlaster-Zertifikat.crt"`)
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(s.ca.der)
}

// mobileconfig wraps the root in an iOS configuration profile, which installs
// with a readable name and description ("Profil geladen" in Settings).
func (s *server) mobileconfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/x-apple-aspen-config")
	w.Header().Set("Content-Disposition", `attachment; filename="WindowBlaster.mobileconfig"`)
	w.Header().Set("Cache-Control", "no-store")
	b64 := base64.StdEncoding.EncodeToString(s.ca.der)
	var wrapped strings.Builder
	for i := 0; i < len(b64); i += 64 {
		end := i + 64
		if end > len(b64) {
			end = len(b64)
		}
		wrapped.WriteString("\t\t\t" + b64[i:end] + "\n")
	}
	name := template.HTMLEscapeString(s.ca.cert.Subject.CommonName)
	fmt.Fprintf(w, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>PayloadCertificateFileName</key>
			<string>WindowBlaster.cer</string>
			<key>PayloadContent</key>
			<data>
%s			</data>
			<key>PayloadDescription</key>
			<string>Erlaubt dem Handy, das Spiel sicher von deinem Mac zu laden.</string>
			<key>PayloadDisplayName</key>
			<string>%s</string>
			<key>PayloadIdentifier</key>
			<string>de.windowblaster.local.root.%s</string>
			<key>PayloadType</key>
			<string>com.apple.security.root</string>
			<key>PayloadUUID</key>
			<string>%s</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>PayloadDescription</key>
	<string>Zertifikat deines Macs für das Spiel Window Blaster. Gilt nur für diesen Mac und kann jederzeit unter Einstellungen → Allgemein → VPN und Geräteverwaltung entfernt werden.</string>
	<key>PayloadDisplayName</key>
	<string>Window Blaster – Mac-Zertifikat</string>
	<key>PayloadIdentifier</key>
	<string>de.windowblaster.local.%s</string>
	<key>PayloadOrganization</key>
	<string>Window Blaster (lokal)</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>%s</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>
`, wrapped.String(), name, s.ca.uuidFrom("root"), s.ca.uuidFrom("root"), profileID(), s.ca.uuidFrom("profile"))
}

// profileID is stable per Mac, so a newer profile replaces the old one on the iPhone.
func profileID() string {
	var b strings.Builder
	for _, r := range strings.ToLower(shortHostname()) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			b.WriteRune(r)
		}
	}
	if b.Len() == 0 {
		return "mac"
	}
	return b.String()
}

// ---------------------------------------------------------------- pages

type qrLink struct {
	URL   string
	Label string
	QR    template.HTML
}

type pageData struct {
	Version string
	Host    string
	// LocalName is the Mac's Bonjour name (name.local): a game address that survives DHCP changes.
	LocalName   string
	HTTPPort    int
	HTTPSPort   int
	Addrs       []localAddr
	Primary     *qrLink
	Others      []qrLink
	DemoURL     string
	Fingerprint string
	CAName      string
}

func (s *server) data() pageData {
	d := pageData{
		Version:     version,
		Host:        shortHostname(),
		LocalName:   strings.ToLower(shortHostname()) + ".local",
		HTTPPort:    s.httpPort,
		HTTPSPort:   s.httpsPort,
		Addrs:       localIPv4s(),
		DemoURL:     fmt.Sprintf("http://localhost:%d/?demo=1", s.httpPort),
		Fingerprint: s.ca.Fingerprint(),
		CAName:      s.ca.cert.Subject.CommonName,
	}
	for i, a := range d.Addrs {
		u := fmt.Sprintf("http://%s:%d/handy", a.IP, s.httpPort)
		label := a.Iface
		switch a.Kind {
		case "wifi":
			label = "WLAN"
		case "sharing":
			label = "Internetfreigabe des Macs"
		case "ethernet":
			label = "Netzwerk " + a.Iface
		}
		l := qrLink{URL: u, Label: label, QR: qrSVG(u)}
		if i == 0 {
			d.Primary = &l
		} else {
			d.Others = append(d.Others, l)
		}
	}
	return d
}

func (s *server) render(w http.ResponseWriter, name string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	if err := pages.ExecuteTemplate(w, name, s.data()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (s *server) connectPage(w http.ResponseWriter, r *http.Request) { s.render(w, "connect.html") }
func (s *server) phonePage(w http.ResponseWriter, r *http.Request)   { s.render(w, "handy.html") }
func (s *server) guidePage(w http.ResponseWriter, r *http.Request)   { s.render(w, "anleitung.html") }

// ---------------------------------------------------------------- terminal

func printBanner(s *server, createdCA bool, dataDir string, quiet bool) {
	addrs := localIPv4s()
	fmt.Printf("\n🚗  Window Blaster läuft  (Version %s)\n\n", version)
	fmt.Printf("   Am Mac spielen (Demo):  http://localhost:%d/?demo=1\n", s.httpPort)
	fmt.Printf("   Verbindungsseite:       http://localhost:%d/verbinden   (öffnet sich gleich im Browser)\n\n", s.httpPort)
	if len(addrs) == 0 {
		fmt.Println("   ⚠️  Der Mac ist in keinem Netzwerk. Für das Handy: Mac und Handy ins selbe WLAN,")
		fmt.Println("      oder am Mac die Internetfreigabe einschalten (siehe ANLEITUNG.html).")
	} else {
		u := fmt.Sprintf("http://%s:%d/handy", addrs[0].IP, s.httpPort)
		fmt.Println("   📱 Handy einrichten: mit der Handy-Kamera diesen Code scannen")
		fmt.Println("      (Handy im selben WLAN wie der Mac):")
		fmt.Println()
		if !quiet {
			fmt.Print(qrTerminal(u))
			fmt.Println()
		}
		fmt.Printf("      oder im Handy-Browser eintippen:  %s\n", u)
		for _, a := range addrs[1:] {
			fmt.Printf("      andere Adresse (%s):           http://%s:%d/handy\n", a.Iface, a.IP, s.httpPort)
		}
	}
	if createdCA {
		fmt.Printf("\n   🔐 Neues Mac-Zertifikat erstellt (gespeichert in %s).\n", dataDir)
	}
	fmt.Println("\n   Dieses Fenster offen lassen, solange das Handy den Mac braucht.")
	fmt.Println("   MacBook bitte aufgeklappt lassen (am besten am Strom), bis das Handy „Offline bereit ✓“ zeigt.")
	fmt.Println("   Beenden: Fenster schließen oder control + C drücken.")
	fmt.Println("────────────────────────────────────────────────────────────────────")
}
