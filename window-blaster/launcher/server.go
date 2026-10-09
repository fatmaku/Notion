package main

import (
	"embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
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
	Ready     bool      `json:"ready"` // the game reported its offline download as finished
}

type server struct {
	appDir    string
	ca        *localCA
	httpPort  int
	httpsPort int
	started   time.Time
	build     string        // build id of the served app (precache.json "v")
	publicURL string        // online copy of the game (wb-meta.json publicUrl or --public-url), "" if none
	quit      chan struct{} // a newer start asked this instance to make room

	mu     sync.Mutex
	phones map[string]*phone
	order  []string
}

func newServer(appDir string, ca *localCA, httpPort, httpsPort int) *server {
	return &server{appDir: appDir, ca: ca, httpPort: httpPort, httpsPort: httpsPort, started: time.Now(), build: readBuild(appDir), publicURL: readPublicURL(appDir), quit: make(chan struct{}, 1), phones: map[string]*phone{}}
}

// readPublicURL returns publicUrl from the app's wb-meta.json ("" if missing or invalid;
// older builds have no such file).
func readPublicURL(dir string) string {
	b, err := os.ReadFile(filepath.Join(dir, "wb-meta.json"))
	if err != nil {
		return ""
	}
	var meta struct {
		Version   string `json:"version"`
		PublicURL string `json:"publicUrl"`
	}
	if json.Unmarshal(b, &meta) != nil {
		return ""
	}
	return normalizePublicURL(meta.PublicURL)
}

// normalizePublicURL accepts an absolute http(s) URL and returns it with a trailing slash
// (pages append "wb-meta.json" to it); anything else yields "".
func normalizePublicURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.User != nil {
		return ""
	}
	u.RawQuery, u.Fragment = "", ""
	if !strings.HasSuffix(u.Path, "/") {
		u.Path += "/"
		u.RawPath = ""
	}
	return u.String()
}

// setupURL is the phone setup page on the Mac's best LAN address ("" without a network).
func (s *server) setupURL(addrs []localAddr) string {
	if len(addrs) == 0 {
		return ""
	}
	return fmt.Sprintf("http://%s:%d/handy", addrs[0].IP, s.httpPort)
}

// readBuild returns the build id of the app in dir ("" if unknown).
func readBuild(dir string) string {
	b, err := os.ReadFile(filepath.Join(dir, "precache.json"))
	if err != nil {
		return ""
	}
	var doc struct {
		V json.Number `json:"v"`
	}
	if json.Unmarshal(b, &doc) != nil {
		return ""
	}
	return doc.V.String()
}

func (s *server) handler(isTLS bool) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/verbinden", s.connectPage)
	mux.HandleFunc("/handy", s.phonePage)
	mux.HandleFunc("/anleitung", s.guidePage)
	mux.HandleFunc("/zertifikat.crt", s.certDER)
	mux.HandleFunc("/zertifikat.mobileconfig", s.mobileconfig)
	mux.HandleFunc("/wb-status", s.status)
	mux.HandleFunc("/wb-quit", s.quitHandler)
	mux.HandleFunc("/wb-qr.svg", s.qrHandler)
	mux.Handle("/", s.appHandler())
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.track(r, isTLS)
		if isTLS && s.macBrowserNavigation(r) {
			// The Mac's own browser opened https://localhost:8443/… (the address of the old
			// version, often from the browser history): its certificate is meant for phones –
			// send it to the plain address that works on the Mac without any warning.
			http.Redirect(w, r, fmt.Sprintf("http://localhost:%d%s", s.httpPort, r.URL.RequestURI()), http.StatusFound)
			return
		}
		if !isTLS && (r.URL.Path == "/" || r.URL.Path == "/index.html") && !isLoopback(r) {
			// A phone opened the game over plain http (typed address, old bookmark): no camera,
			// no offline there – the setup page is what it needs. The Mac itself keeps the demo.
			w.Header().Set("Cache-Control", "no-store")
			http.Redirect(w, r, "/handy", http.StatusFound)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func isLoopback(r *http.Request) bool {
	ip := remoteIP(r)
	return ip != nil && ip.IsLoopback()
}

// macBrowserNavigation: a page load (not a fetch) from a browser on this Mac via localhost.
func (s *server) macBrowserNavigation(r *http.Request) bool {
	if !isLoopback(r) {
		return false
	}
	host := r.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	if host != "localhost" && host != "127.0.0.1" {
		return false
	}
	return r.Header.Get("Sec-Fetch-Mode") == "navigate" || (r.Header.Get("Sec-Fetch-Mode") == "" && strings.Contains(r.Header.Get("Accept"), "text/html"))
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
	case strings.Contains(ua, "OculusBrowser") || strings.Contains(ua, "Quest") || strings.Contains(ua, "Pico") || strings.Contains(ua, "Wolvic"):
		return "Headset"
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
	if p == "/wb-status" && r.Method == http.MethodGet && r.URL.Query().Get("offline") == "done" && !ph.Ready {
		ph.Ready = true
		event("✅", fmt.Sprintf("%s ist offline bereit – der Mac wird nicht mehr gebraucht", ph.Device))
	}
}

const maxPhones = 16

// outMu keeps terminal lines from different goroutines (requests, address watcher) whole.
var outMu sync.Mutex

func event(icon, msg string) {
	outMu.Lock()
	defer outMu.Unlock()
	fmt.Printf("%s %s  %s\n", time.Now().Format("15:04:05"), icon, msg)
}

// ---------------------------------------------------------------- endpoints

type statusDoc struct {
	OK        bool        `json:"ok"`
	Secure    bool        `json:"secure"`
	Version   string      `json:"version"`
	HTTPPort  int         `json:"httpPort"`
	HTTPSPort int         `json:"httpsPort"`
	AppDir    string      `json:"appDir,omitempty"`
	Build     string      `json:"build,omitempty"`
	SetupURL  string      `json:"setupUrl"`  // http://<primary IPv4>:<http port>/handy, "" without a network
	PublicURL string      `json:"publicUrl"` // online copy of the game, "" if none
	Addrs     []localAddr `json:"addrs"`
	Phones    []phone     `json:"phones"`
}

func (s *server) status(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json")
	addrs := localIPv4s()
	doc := statusDoc{OK: true, Secure: r.TLS != nil, Version: version, HTTPPort: s.httpPort, HTTPSPort: s.httpsPort, SetupURL: s.setupURL(addrs), PublicURL: s.publicURL}
	if s.isLocalPage(r) {
		// details only for the Mac itself
		doc.AppDir, doc.Build = s.appDir, s.build
		doc.Addrs = addrs
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

// maxQRText bounds /wb-qr.svg input (a Wi-Fi join string is < 200 bytes).
const maxQRText = 600

// qrHandler renders ?t= as an SVG QR code for the Mac's connect page (the Wi-Fi QR is built
// there from a form, so the password never leaves this Mac). Local page only.
func (s *server) qrHandler(w http.ResponseWriter, r *http.Request) {
	if !s.isLocalPage(r) {
		http.Error(w, "nicht erlaubt", http.StatusForbidden)
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "nicht erlaubt", http.StatusMethodNotAllowed)
		return
	}
	t := r.URL.Query().Get("t")
	if t == "" || len(t) > maxQRText {
		http.Error(w, "ungültiger Text", http.StatusBadRequest)
		return
	}
	svg := qrSVGLabel(t, "QR-Code")
	if svg == "" {
		http.Error(w, "ungültiger Text", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "image/svg+xml")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
	_, _ = io.WriteString(w, string(svg))
}

// quitHandler lets a newer start on the same Mac stop this instance (POST, local only).
func (s *server) quitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || !s.isLocalPage(r) || r.Header.Get("Origin") != "" {
		http.Error(w, "nicht erlaubt", http.StatusForbidden)
		return
	}
	w.WriteHeader(http.StatusNoContent)
	select {
	case s.quit <- struct{}{}:
	default:
	}
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
	Base  string // http://<ip>:<port> (URL without /handy, for line breaks)
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
	// SetupURL is the primary phone setup address ("" without a network).
	SetupURL string
	// PublicURL is the online copy of the game ("" if none); PublicQR its QR code.
	PublicURL string
	PublicQR  template.HTML
	// QuestURL sends PublicURL to a Meta Quest via Meta's "Web Launch" page (https only).
	QuestURL string
	QuestQR  template.HTML
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
		PublicURL:   s.publicURL,
	}
	d.SetupURL = s.setupURL(d.Addrs)
	if d.PublicURL != "" {
		d.PublicQR = qrSVG(d.PublicURL)
		if strings.HasPrefix(d.PublicURL, "https://") {
			d.QuestURL = questLaunchURL(d.PublicURL)
			d.QuestQR = qrSVG(d.QuestURL)
		}
	}
	for i, a := range d.Addrs {
		base := fmt.Sprintf("http://%s:%d", a.IP, s.httpPort)
		u := base + "/handy"
		label := a.Iface
		switch a.Kind {
		case "wifi":
			label = "WLAN"
		case "sharing":
			label = "Internetfreigabe des Macs"
		case "ethernet":
			label = "Netzwerk " + a.Iface
		}
		l := qrLink{URL: u, Base: base, Label: label, QR: qrSVG(u)}
		if i == 0 {
			d.Primary = &l
		} else {
			d.Others = append(d.Others, l)
		}
	}
	return d
}

// questLaunchURL is Meta's "Web Launch" link: opened on the phone (signed in to the Meta
// account), it sends target to the chosen Quest headset's browser.
func questLaunchURL(target string) string {
	return "https://www.oculus.com/open_url/?url=" + url.QueryEscape(target)
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
	var b strings.Builder
	fmt.Fprintf(&b, "\n🚗  Window Blaster läuft  (Version %s)\n\n", version)
	fmt.Fprintf(&b, "   Am Mac spielen (Demo):  http://localhost:%d/?demo=1\n", s.httpPort)
	fmt.Fprintf(&b, "   Verbindungsseite:       http://localhost:%d/verbinden   (öffnet sich gleich im Browser)\n\n", s.httpPort)
	if s.publicURL != "" {
		fmt.Fprintf(&b, "   🌐 Online-Version (ohne Mac, ohne Zertifikat – sobald eingeschaltet):\n      %s\n\n", s.publicURL)
	}
	if len(addrs) == 0 {
		b.WriteString("   ⚠️  Der Mac ist in keinem Netzwerk. Für das Handy: Mac und Handy ins selbe WLAN,\n")
		b.WriteString("      oder am Mac die Internetfreigabe einschalten (siehe ANLEITUNG.html).\n")
	} else {
		u := s.setupURL(addrs)
		b.WriteString("   📱 Handy einrichten: mit der Handy-Kamera diesen Code scannen\n")
		b.WriteString("      (Handy im selben WLAN wie der Mac):\n\n")
		if !quiet {
			b.WriteString(qrTerminal(u))
			b.WriteString("\n")
		}
		fmt.Fprintf(&b, "      oder im Handy-Browser eintippen:  %s\n", u)
		for _, a := range addrs[1:] {
			fmt.Fprintf(&b, "      andere Adresse (%s):           http://%s:%d/handy\n", a.Iface, a.IP, s.httpPort)
		}
	}
	if createdCA {
		fmt.Fprintf(&b, "\n   🔐 Neues Mac-Zertifikat erstellt (gespeichert in %s).\n", dataDir)
	}
	b.WriteString("\n   Dieses Fenster offen lassen, solange das Handy den Mac braucht.\n")
	b.WriteString("   MacBook bitte aufgeklappt lassen (am besten am Strom), bis das Handy „Offline bereit ✓“ zeigt.\n")
	b.WriteString("   Beenden: Fenster schließen oder control + C drücken.\n")
	b.WriteString("────────────────────────────────────────────────────────────────────\n")
	outMu.Lock()
	defer outMu.Unlock()
	fmt.Print(b.String())
}

// addrWatcher prints a fresh setup address (and QR code) when the Mac's LAN addresses change,
// e.g. after switching Wi-Fi or turning on Internet Sharing while the terminal is open.
type addrWatcher struct {
	list     func() []localAddr
	out      io.Writer
	httpPort int
	quiet    bool

	mu  sync.Mutex
	key string
}

func newAddrWatcher(list func() []localAddr, out io.Writer, httpPort int, quiet bool) *addrWatcher {
	return &addrWatcher{list: list, out: out, httpPort: httpPort, quiet: quiet, key: addrKey(list())}
}

func addrKey(addrs []localAddr) string {
	ips := make([]string, len(addrs))
	for i, a := range addrs {
		ips[i] = a.IP
	}
	return strings.Join(ips, ",")
}

// check compares the current addresses with the last ones and reports whether it printed.
func (w *addrWatcher) check() bool {
	addrs := w.list()
	key := addrKey(addrs)
	w.mu.Lock()
	changed := key != w.key
	w.key = key
	w.mu.Unlock()
	if !changed {
		return false
	}
	var b strings.Builder
	stamp := time.Now().Format("15:04:05")
	if len(addrs) == 0 {
		fmt.Fprintf(&b, "%s ⚠️  Der Mac ist in keinem Netzwerk mehr – Handy und Mac wieder ins selbe WLAN bringen.\n", stamp)
	} else {
		u := fmt.Sprintf("http://%s:%d/handy", addrs[0].IP, w.httpPort)
		fmt.Fprintf(&b, "%s 🔄 Neue Adresse – Handy einrichten jetzt mit diesem Code:\n\n", stamp)
		if !w.quiet {
			b.WriteString(qrTerminal(u))
			b.WriteString("\n")
		}
		fmt.Fprintf(&b, "      oder im Handy-Browser eintippen:  %s\n", u)
		for _, a := range addrs[1:] {
			fmt.Fprintf(&b, "      andere Adresse (%s):           http://%s:%d/handy\n", a.Iface, a.IP, w.httpPort)
		}
	}
	outMu.Lock()
	defer outMu.Unlock()
	_, _ = io.WriteString(w.out, b.String())
	return true
}

// run polls every interval until stop is closed.
func (w *addrWatcher) run(stop <-chan struct{}, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-stop:
			return
		case <-t.C:
			w.check()
		}
	}
}
