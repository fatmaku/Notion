package main

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

func testApp(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	must := func(err error) {
		if err != nil {
			t.Fatal(err)
		}
	}
	must(os.MkdirAll(filepath.Join(dir, "mediapipe", "wasm"), 0o755))
	must(os.MkdirAll(filepath.Join(dir, "models"), 0o755))
	must(os.WriteFile(filepath.Join(dir, "index.html"), []byte("<!doctype html><title>WB</title>"), 0o644))
	must(os.WriteFile(filepath.Join(dir, "manifest.webmanifest"), []byte("{}"), 0o644))
	must(os.WriteFile(filepath.Join(dir, "mediapipe", "wasm", "x.wasm"), []byte("\x00asm"), 0o644))
	must(os.WriteFile(filepath.Join(dir, "models", "m.tflite"), []byte("TFL3"), 0o644))
	return dir
}

func TestCAPersistsAndReloads(t *testing.T) {
	dir := t.TempDir()
	a, created, err := loadOrCreateCA(dir)
	if err != nil || !created {
		t.Fatalf("create: %v %v", err, created)
	}
	b, created2, err := loadOrCreateCA(dir)
	if err != nil || created2 {
		t.Fatalf("reload: %v %v", err, created2)
	}
	if a.Fingerprint() != b.Fingerprint() {
		t.Fatal("CA changed on reload")
	}
	if !a.cert.IsCA || a.cert.MaxPathLen != 0 || !a.cert.MaxPathLenZero {
		t.Fatal("root must be a CA with path length 0")
	}
	if st, _ := os.Stat(filepath.Join(dir, caKeyFile)); st.Mode().Perm() != 0o600 {
		t.Fatalf("key permissions %v", st.Mode().Perm())
	}
}

func TestLeafVerifiesForIPAndHostname(t *testing.T) {
	ca, _, err := loadOrCreateCA(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	pool := x509.NewCertPool()
	pool.AddCert(ca.cert)
	for _, name := range []string{"192.168.2.1", "10.0.0.7", "fatmas-macbook-air.local", "localhost"} {
		c, err := ca.leafFor(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := c.Leaf.Verify(x509.VerifyOptions{DNSName: name, Roots: pool, KeyUsages: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}}); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if days := time.Until(c.Leaf.NotAfter).Hours() / 24; days > 825 || days < 300 {
			t.Fatalf("leaf lifetime %v days", days)
		}
	}
}

func TestHTTPSServesAppWithTrustedCA(t *testing.T) {
	ca, _, err := loadOrCreateCA(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	s := newServer(testApp(t), ca, 8080, 8443)
	url := startTLS(t, ca, s.handler(true))
	pool := x509.NewCertPool()
	pool.AddCert(ca.cert)
	// connect by IP without SNI, like a phone opening https://192.168.x.y:8443
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool}}}
	cases := map[string]string{
		"/":                        "text/html; charset=utf-8",
		"/manifest.webmanifest":    "application/manifest+json",
		"/mediapipe/wasm/x.wasm":   "application/wasm",
		"/models/m.tflite":         "application/octet-stream",
		"/wb-status":               "application/json",
		"/zertifikat.mobileconfig": "application/x-apple-aspen-config",
		"/zertifikat.crt":          "application/x-x509-ca-cert",
		"/handy":                   "text/html; charset=utf-8",
		"/verbinden":               "text/html; charset=utf-8",
		"/anleitung":               "text/html; charset=utf-8",
	}
	for p, want := range cases {
		req, _ := http.NewRequest("GET", url+p, nil)
		req.Header.Set("Origin", "http://192.168.1.5:8080") // like the phone page's cross-origin probe
		res, err := client.Do(req)
		if err != nil {
			t.Fatalf("%s: %v", p, err)
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != 200 {
			t.Fatalf("%s: status %d %s", p, res.StatusCode, body)
		}
		if got := res.Header.Get("Content-Type"); got != want {
			t.Fatalf("%s: content-type %q want %q", p, got, want)
		}
		if p == "/wb-status" {
			var st statusDoc
			if err := json.Unmarshal(body, &st); err != nil || !st.OK || !st.Secure {
				t.Fatalf("status doc %s", body)
			}
			if res.Header.Get("Access-Control-Allow-Origin") != "*" {
				t.Fatal("status must allow cross-origin checks from the phone page")
			}
		}
		if p == "/zertifikat.mobileconfig" && (!strings.Contains(string(body), "com.apple.security.root") || !strings.Contains(string(body), "<data>")) {
			t.Fatalf("mobileconfig malformed: %s", body)
		}
		if p == "/handy" && !regexp.MustCompile(`HTTPS_PORT =\s*8443\s*;`).Match(body) {
			t.Fatalf("handy page must embed the https port: %s", body)
		}
	}
	// directory traversal must not escape the app folder
	res, err := client.Get(url + "/../../etc/passwd")
	if err == nil {
		b, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if strings.Contains(string(b), "root:") {
			t.Fatal("path traversal")
		}
	}
}

func TestUntrustedClientFailsHandshake(t *testing.T) {
	ca, _, err := loadOrCreateCA(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	s := newServer(testApp(t), ca, 8080, 8443)
	url := startTLS(t, ca, s.handler(true))
	if _, err := http.Get(url + "/wb-status"); err == nil {
		t.Fatal("a client without the CA must not trust the server")
	}
}

func TestTrackingAndPhonesInStatus(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	s := newServer(testApp(t), ca, 8080, 8443)
	h := s.handler(false)
	req := httptest.NewRequest("GET", "/zertifikat.mobileconfig", nil)
	req.RemoteAddr = "192.168.1.23:5555"
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")
	h.ServeHTTP(httptest.NewRecorder(), req)
	st := httptest.NewRequest("GET", "/wb-status", nil)
	st.RemoteAddr = "127.0.0.1:4444"
	st.Host = "localhost:8080"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, st)
	var doc statusDoc
	_ = json.Unmarshal(rec.Body.Bytes(), &doc)
	if len(doc.Phones) != 1 || !doc.Phones[0].Cert || doc.Phones[0].Device != "iPhone" {
		t.Fatalf("phones: %+v", doc.Phones)
	}
	// phones must not see other phones' details
	st2 := httptest.NewRequest("GET", "/wb-status", nil)
	st2.RemoteAddr = "192.168.1.50:1"
	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, st2)
	if strings.Contains(rec2.Body.String(), "192.168.1.23") {
		t.Fatal("status leaks phone list to non-local clients")
	}
}

func TestListenFirstSkipsBusyPort(t *testing.T) {
	busy, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatal(err)
	}
	defer busy.Close()
	port := busy.Addr().(*net.TCPAddr).Port
	ln, got, err := listenFirst(port)
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	if got == port {
		t.Fatal("should have skipped the busy port")
	}
}

func TestQRRenders(t *testing.T) {
	svg := string(qrSVG("http://192.168.178.20:8080/handy"))
	if !strings.HasPrefix(svg, "<svg") || !strings.Contains(svg, "M") {
		t.Fatal("svg")
	}
	if term := qrTerminal("http://192.168.178.20:8080/handy"); !strings.Contains(term, "█") {
		t.Fatal("terminal qr")
	}
}

// startTLS serves h exactly like production (GetCertificate only, no static certs)
// on 127.0.0.1 and returns the base URL (IP, so the client sends no SNI).
func startTLS(t *testing.T, ca *localCA, h http.Handler) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	srv := &http.Server{Handler: h, TLSConfig: ca.tlsConfig(), ErrorLog: quietTLSLog()}
	go func() { _ = srv.ServeTLS(ln, "", "") }()
	t.Cleanup(func() { _ = srv.Close() })
	return "https://" + ln.Addr().String()
}

func TestLeafCacheIsBounded(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	for i := 0; i < 300; i++ {
		if _, err := ca.getCertificate(&tls.ClientHelloInfo{ServerName: fmt.Sprintf("x%d.local", i)}); err != nil {
			t.Fatal(err)
		}
		if _, err := ca.getCertificate(&tls.ClientHelloInfo{ServerName: fmt.Sprintf("evil%d.example", i)}); err != nil {
			t.Fatal(err)
		}
	}
	if n := len(ca.leaves); n > 64 {
		t.Fatalf("leaf cache grew to %d", n)
	}
	if _, ok := ca.leaves["evil1.example"]; ok {
		t.Fatal("minted a leaf for a foreign domain")
	}
}

func TestStatusDetailsOnlyForLocalPage(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	s := newServer(testApp(t), ca, 8080, 8443)
	h := s.handler(false)
	get := func(host, origin string) (*httptest.ResponseRecorder, statusDoc) {
		r := httptest.NewRequest("GET", "/wb-status", nil)
		r.RemoteAddr = "127.0.0.1:4444"
		r.Host = host
		if origin != "" {
			r.Header.Set("Origin", origin)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, r)
		var doc statusDoc
		_ = json.Unmarshal(rec.Body.Bytes(), &doc)
		return rec, doc
	}
	if rec, doc := get("localhost:8080", ""); doc.Addrs == nil && len(localIPv4s()) > 0 || rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("local page must get details without CORS: %+v", doc)
	}
	if _, doc := get("localhost:8080", "https://evil.example"); doc.Addrs != nil || doc.Phones != nil {
		t.Fatal("foreign origin got details")
	}
	if _, doc := get("rebind.evil.example:8080", ""); doc.Addrs != nil || doc.Phones != nil {
		t.Fatal("DNS-rebinding host got details")
	}
	if rec, _ := get("192.168.1.2:8080", ""); rec.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatal("minimal status must stay readable cross-origin for the phone probe")
	}
}

func TestTrustOnlyFromProbeOrServiceWorker(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	s := newServer(testApp(t), ca, 8080, 8443)
	h := s.handler(true)
	do := func(target string, hdr map[string]string) {
		r := httptest.NewRequest("GET", target, nil)
		r.RemoteAddr = "192.168.1.23:5555"
		for k, v := range hdr {
			r.Header.Set(k, v)
		}
		h.ServeHTTP(httptest.NewRecorder(), r)
	}
	do("/", nil)
	if s.phones["192.168.1.23"].HTTPS {
		t.Fatal("a clicked-through page load must not count as trusted")
	}
	do("/sw.js", map[string]string{"Service-Worker": "script"})
	if !s.phones["192.168.1.23"].HTTPS {
		t.Fatal("service-worker script fetch proves trust")
	}
	for i := 0; i < 40; i++ {
		r := httptest.NewRequest("GET", "/", nil)
		r.RemoteAddr = fmt.Sprintf("10.0.0.%d:1", i)
		h.ServeHTTP(httptest.NewRecorder(), r)
	}
	if len(s.phones) > maxPhones {
		t.Fatalf("phone list grew to %d", len(s.phones))
	}
}

func TestNoListingsNoSymlinkEscape(t *testing.T) {
	app := testApp(t)
	secret := filepath.Join(t.TempDir(), "secret.txt")
	_ = os.WriteFile(secret, []byte("TOPSECRET"), 0o600)
	_ = os.MkdirAll(filepath.Join(app, "assets"), 0o755)
	if err := os.Symlink(secret, filepath.Join(app, "link.txt")); err != nil {
		t.Skip("no symlinks here")
	}
	ca, _, _ := loadOrCreateCA(t.TempDir())
	h := newServer(app, ca, 8080, 8443).handler(false)
	for _, p := range []string{"/link.txt", "/assets/"} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", p, nil))
		if rec.Code == 200 || strings.Contains(rec.Body.String(), "TOPSECRET") {
			t.Fatalf("%s served: %d %s", p, rec.Code, rec.Body.String())
		}
	}
}

func TestCAIsNameConstrainedToLocalAddresses(t *testing.T) {
	ca, _, err := loadOrCreateCA(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if !ca.cert.PermittedDNSDomainsCritical || len(ca.cert.PermittedIPRanges) == 0 {
		t.Fatal("CA must carry name constraints")
	}
	for name, want := range map[string]bool{"192.168.178.20": true, "10.1.2.3": true, "172.20.0.5": true, "100.70.1.1": true, "mac.local": true, "localhost": true, "8.8.8.8": false, "evil.example.com": false, "bank.de": false} {
		if allowedName(name) != want {
			t.Fatalf("allowedName(%s) = %v", name, !want)
		}
	}
	// a request for a foreign name never yields a certificate for it
	c, err := ca.getCertificate(&tls.ClientHelloInfo{ServerName: "evil.example.com"})
	if err != nil {
		t.Fatal(err)
	}
	if c.Leaf.VerifyHostname("evil.example.com") == nil {
		t.Fatal("minted a certificate for a foreign domain")
	}
	// and even a hand-made leaf for a public name would fail the CA's constraints
	pool := x509.NewCertPool()
	pool.AddCert(ca.cert)
	bad, err := ca.leafFor("example.com")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := bad.Leaf.Verify(x509.VerifyOptions{DNSName: "example.com", Roots: pool}); err == nil {
		t.Fatal("name constraints not enforced")
	}
}

func TestNewerStartTakesOverFromOldVersion(t *testing.T) {
	free := func() int {
		ln, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			t.Fatal(err)
		}
		defer ln.Close()
		return ln.Addr().(*net.TCPAddr).Port
	}
	httpPort, httpsPort := free(), free()
	data := t.TempDir()
	appA, appB := testApp(t), testApp(t)
	_ = os.WriteFile(filepath.Join(appA, "precache.json"), []byte(`{"v":1,"files":[]}`), 0o644)
	_ = os.WriteFile(filepath.Join(appB, "precache.json"), []byte(`{"v":2,"files":[]}`), 0o644)
	_ = os.WriteFile(filepath.Join(appB, "marker.txt"), []byte("NEU"), 0o644)
	cfg := func(app string) config {
		return config{appDir: app, dataDir: data, httpPort: httpPort, httpsPort: httpsPort, open: false, quiet: true}
	}
	doneA := make(chan error, 1)
	go func() { doneA <- run(cfg(appA)) }()
	waitUp := func() {
		for i := 0; i < 50; i++ {
			if _, ok := alreadyRunning(httpsPort); ok {
				return
			}
			time.Sleep(100 * time.Millisecond)
		}
		t.Fatal("server did not come up")
	}
	waitUp()
	// same folder again → reuses the running instance and returns at once
	if err := run(cfg(appA)); err != nil {
		t.Fatal(err)
	}
	doneB := make(chan error, 1)
	go func() { doneB <- run(cfg(appB)) }()
	select {
	case err := <-doneA:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(6 * time.Second):
		t.Fatal("old instance did not quit")
	}
	waitUp()
	res, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/marker.txt", httpPort))
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if string(body) != "NEU" {
		t.Fatalf("new version not served: %d %q", res.StatusCode, body)
	}
	if doc, _ := alreadyRunning(httpsPort); doc.HTTPPort != httpPort {
		t.Fatalf("ports moved: %+v", doc)
	}
	// a web page must not be able to stop the server
	req, _ := http.NewRequest("POST", fmt.Sprintf("http://127.0.0.1:%d/wb-quit", httpPort), nil)
	req.Header.Set("Origin", "https://evil.example")
	if r, err := http.DefaultClient.Do(req); err == nil {
		r.Body.Close()
		if r.StatusCode != http.StatusForbidden {
			t.Fatalf("cross-origin quit allowed: %d", r.StatusCode)
		}
	}
	_ = doneB
}

func TestOldCaddyServerIsStoppedOthersLeftAlone(t *testing.T) {
	if _, err := exec.LookPath("lsof"); err != nil {
		t.Skip("no lsof")
	}
	py, err := exec.LookPath("python3")
	if err != nil {
		t.Skip("no python3")
	}
	dir := t.TempDir()
	start := func(name string) (int, *exec.Cmd) {
		bin := filepath.Join(dir, name)
		b, _ := os.ReadFile(py)
		if err := os.WriteFile(bin, b, 0o755); err != nil {
			t.Fatal(err)
		}
		ln, _ := net.Listen("tcp", "127.0.0.1:0")
		port := ln.Addr().(*net.TCPAddr).Port
		ln.Close()
		cmd := exec.Command(bin, "-m", "http.server", strconv.Itoa(port))
		cmd.Dir = dir
		if err := cmd.Start(); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _ = cmd.Process.Kill(); _, _ = cmd.Process.Wait() })
		for i := 0; i < 50 && portFree(port); i++ {
			time.Sleep(100 * time.Millisecond)
		}
		return port, cmd
	}
	oldPort, old := start("caddy-linux-amd64")
	otherPort, _ := start("someserver")
	go func() { _, _ = old.Process.Wait() }()
	freeOldServers(oldPort, otherPort)
	if !portFree(oldPort) {
		t.Fatal("old Window Blaster server still holds its port")
	}
	if portFree(otherPort) {
		t.Fatal("an unrelated program was stopped")
	}
}

func TestMacBrowserOnOldHTTPSAddressIsRedirected(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	h := newServer(testApp(t), ca, 8080, 8443).handler(true)
	r := httptest.NewRequest("GET", "https://localhost:8443/?demo=1", nil)
	r.RemoteAddr = "127.0.0.1:5000"
	r.Header.Set("Sec-Fetch-Mode", "navigate")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, r)
	if rec.Code != http.StatusFound || rec.Header().Get("Location") != "http://localhost:8080/?demo=1" {
		t.Fatalf("got %d %q", rec.Code, rec.Header().Get("Location"))
	}
	// phones (not loopback) and fetches keep HTTPS
	r2 := httptest.NewRequest("GET", "https://192.168.1.5:8443/", nil)
	r2.RemoteAddr = "192.168.1.9:5000"
	r2.Header.Set("Sec-Fetch-Mode", "navigate")
	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, r2)
	if rec2.Code != http.StatusOK {
		t.Fatalf("phone got %d", rec2.Code)
	}
}

func TestPublicURLFromMetaAndFlag(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	app := testApp(t)
	if s := newServer(app, ca, 8080, 8443); s.publicURL != "" {
		t.Fatalf("missing wb-meta.json must mean no public URL, got %q", s.publicURL)
	}
	_ = os.WriteFile(filepath.Join(app, "wb-meta.json"), []byte(`{"version":"0.8.0","publicUrl":"https://fatmaku.github.io/Notion/window-blaster/"}`), 0o644)
	if s := newServer(app, ca, 8080, 8443); s.publicURL != "https://fatmaku.github.io/Notion/window-blaster/" {
		t.Fatalf("publicUrl not read: %q", s.publicURL)
	}
	_ = os.WriteFile(filepath.Join(app, "wb-meta.json"), []byte(`{"version":"0.8.0","publicUrl":""}`), 0o644)
	if s := newServer(app, ca, 8080, 8443); s.publicURL != "" {
		t.Fatalf("empty publicUrl: %q", s.publicURL)
	}
	_ = os.WriteFile(filepath.Join(app, "wb-meta.json"), []byte(`not json`), 0o644)
	if s := newServer(app, ca, 8080, 8443); s.publicURL != "" {
		t.Fatalf("broken wb-meta.json: %q", s.publicURL)
	}
	for in, want := range map[string]string{
		"https://fatmaku.github.io/Notion/window-blaster/": "https://fatmaku.github.io/Notion/window-blaster/",
		"https://fatmaku.github.io/Notion/window-blaster":  "https://fatmaku.github.io/Notion/window-blaster/",
		" http://127.0.0.1:9/ ":                            "http://127.0.0.1:9/",
		"http://127.0.0.1:9":                               "http://127.0.0.1:9/",
		"https://example.org/x/?a=1#f":                     "https://example.org/x/",
		"":                                                 "",
		"javascript:alert(1)":                              "",
		"ftp://example.org/":                               "",
		"/relative/":                                       "",
		"https://user:pw@example.org/":                     "",
	} {
		if got := normalizePublicURL(in); got != want {
			t.Fatalf("normalizePublicURL(%q) = %q, want %q", in, got, want)
		}
	}
	// --public-url overrides; an explicitly empty value disables
	cfg, _, err := parseFlags([]string{"--public-url", "http://127.0.0.1:9/"})
	if err != nil || !cfg.publicURLSet || cfg.publicURL != "http://127.0.0.1:9/" {
		t.Fatalf("flag: %+v %v", cfg, err)
	}
	cfg, _, err = parseFlags([]string{"--public-url="})
	if err != nil || !cfg.publicURLSet || cfg.publicURL != "" {
		t.Fatalf("empty flag: %+v %v", cfg, err)
	}
	cfg, showVersion, err := parseFlags([]string{"--quiet", "--version"})
	if err != nil || cfg.publicURLSet || !cfg.quiet || !showVersion || cfg.httpPort != 8080 {
		t.Fatalf("defaults: %+v %v", cfg, err)
	}
}

func TestPublicURLFlagOverridesMetaInRun(t *testing.T) {
	free := func() int {
		ln, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			t.Fatal(err)
		}
		defer ln.Close()
		return ln.Addr().(*net.TCPAddr).Port
	}
	httpPort, httpsPort := free(), free()
	app := testApp(t)
	_ = os.WriteFile(filepath.Join(app, "wb-meta.json"), []byte(`{"version":"0.8.0","publicUrl":"https://fatmaku.github.io/Notion/window-blaster/"}`), 0o644)
	cfg := config{appDir: app, dataDir: t.TempDir(), httpPort: httpPort, httpsPort: httpsPort, quiet: true, publicURL: "http://127.0.0.1:9", publicURLSet: true}
	go func() { _ = run(cfg) }()
	var doc statusDoc
	var ok bool
	for i := 0; i < 50 && !ok; i++ {
		doc, ok = alreadyRunning(httpsPort)
		time.Sleep(50 * time.Millisecond)
	}
	if !ok || doc.PublicURL != "http://127.0.0.1:9/" {
		t.Fatalf("status after --public-url: %+v", doc)
	}
	if !stopOther(httpsPort, httpPort) {
		t.Fatal("server did not stop")
	}
}

func TestStatusHasSetupAndPublicURLForEveryone(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	s := newServer(testApp(t), ca, 8080, 8443)
	s.publicURL = "https://fatmaku.github.io/Notion/window-blaster/"
	addrs := localIPv4s()
	wantSetup := ""
	if len(addrs) > 0 {
		wantSetup = "http://" + addrs[0].IP + ":8080/handy"
	}
	for _, isTLS := range []bool{false, true} {
		h := s.handler(isTLS)
		for _, c := range []struct{ remote, host string }{{"127.0.0.1:4444", "localhost:8080"}, {"192.168.1.50:1", "192.168.1.2:8080"}} {
			r := httptest.NewRequest("GET", "/wb-status", nil)
			r.RemoteAddr, r.Host = c.remote, c.host
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, r)
			var raw map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
				t.Fatal(err)
			}
			if raw["setupUrl"] != wantSetup || raw["publicUrl"] != s.publicURL {
				t.Fatalf("%s tls=%v: %s", c.remote, isTLS, rec.Body.String())
			}
		}
	}
	// without a public URL the field is still there, empty
	s.publicURL = ""
	r := httptest.NewRequest("GET", "/wb-status", nil)
	r.RemoteAddr = "192.168.1.50:1"
	rec := httptest.NewRecorder()
	s.handler(false).ServeHTTP(rec, r)
	if !strings.Contains(rec.Body.String(), `"publicUrl":""`) || !strings.Contains(rec.Body.String(), `"setupUrl":`) {
		t.Fatalf("fields missing: %s", rec.Body.String())
	}
}

func TestOfflineDoneMarksPhoneReady(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	s := newServer(testApp(t), ca, 8080, 8443)
	h := s.handler(true)
	do := func(target string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", target, nil)
		r.RemoteAddr = "192.168.1.23:5555"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, r)
		return rec
	}
	do("/wb-status")
	if s.phones["192.168.1.23"].Ready {
		t.Fatal("plain status must not mark ready")
	}
	if rec := do("/wb-status?offline=done"); rec.Code != 200 || rec.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("offline=done: %d", rec.Code)
	}
	if !s.phones["192.168.1.23"].Ready {
		t.Fatal("offline=done must mark the phone ready")
	}
	st := httptest.NewRequest("GET", "/wb-status", nil)
	st.RemoteAddr, st.Host = "127.0.0.1:4444", "localhost:8080"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, st)
	var doc statusDoc
	_ = json.Unmarshal(rec.Body.Bytes(), &doc)
	if len(doc.Phones) != 1 || !doc.Phones[0].Ready || !strings.Contains(rec.Body.String(), `"ready":true`) {
		t.Fatalf("connect page must see ready: %s", rec.Body.String())
	}
}

func TestPlainHTTPGameRedirectsPhonesToSetup(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	s := newServer(testApp(t), ca, 8080, 8443)
	get := func(isTLS bool, remote, target string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", target, nil)
		r.RemoteAddr = remote
		if remote == "127.0.0.1:5000" {
			r.Host = "localhost:8080"
		} else {
			r.Host = "192.168.1.2:8080"
		}
		rec := httptest.NewRecorder()
		s.handler(isTLS).ServeHTTP(rec, r)
		return rec
	}
	for _, p := range []string{"/", "/index.html", "/?demo=1"} {
		if rec := get(false, "192.168.1.9:5000", p); rec.Code != http.StatusFound || rec.Header().Get("Location") != "/handy" {
			t.Fatalf("phone %s over http: %d %q", p, rec.Code, rec.Header().Get("Location"))
		}
	}
	for _, p := range []string{"/handy", "/manifest.webmanifest", "/zertifikat.crt", "/zertifikat.mobileconfig", "/wb-status", "/anleitung", "/models/m.tflite"} {
		if rec := get(false, "192.168.1.9:5000", p); rec.Code != 200 {
			t.Fatalf("phone %s over http: %d", p, rec.Code)
		}
	}
	if rec := get(false, "127.0.0.1:5000", "/"); rec.Code != 200 || !strings.Contains(rec.Body.String(), "<title>WB</title>") {
		t.Fatalf("Mac's own browser must get the game: %d", rec.Code)
	}
	if rec := get(false, "127.0.0.1:5000", "/?demo=1"); rec.Code != 200 {
		t.Fatalf("Mac demo: %d", rec.Code)
	}
	if rec := get(true, "192.168.1.9:5000", "/"); rec.Code != 200 || !strings.Contains(rec.Body.String(), "<title>WB</title>") {
		t.Fatalf("phone over https must get the game: %d", rec.Code)
	}
}

func TestQRSVGEndpointLocalOnly(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	h := newServer(testApp(t), ca, 8080, 8443).handler(false)
	wifi := `WIFI:T:WPA;S:Mein\;Netz;P:geheim\:passwort;;`
	get := func(remote, host, origin, text string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", "/wb-qr.svg?wbping=1&t="+urlQueryEscape(text), nil)
		r.RemoteAddr, r.Host = remote, host
		if origin != "" {
			r.Header.Set("Origin", origin)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, r)
		return rec
	}
	rec := get("127.0.0.1:1", "localhost:8080", "", wifi)
	if rec.Code != 200 || rec.Header().Get("Content-Type") != "image/svg+xml" || rec.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("local: %d %v", rec.Code, rec.Header())
	}
	body := rec.Body.String()
	if !strings.HasPrefix(body, "<svg") || !strings.Contains(body, `xmlns="http://www.w3.org/2000/svg"`) || strings.Contains(body, "geheim") {
		t.Fatalf("svg must be standalone and not echo the password: %.200s", body)
	}
	for name, rec := range map[string]*httptest.ResponseRecorder{
		"phone":          get("192.168.1.9:1", "192.168.1.2:8080", "", wifi),
		"rebinding host": get("127.0.0.1:1", "evil.example:8080", "", wifi),
		"foreign origin": get("127.0.0.1:1", "localhost:8080", "https://evil.example", wifi),
	} {
		if rec.Code != http.StatusForbidden {
			t.Fatalf("%s: %d", name, rec.Code)
		}
	}
	if rec := get("127.0.0.1:1", "localhost:8080", "", ""); rec.Code != http.StatusBadRequest {
		t.Fatalf("empty text: %d", rec.Code)
	}
	if rec := get("127.0.0.1:1", "localhost:8080", "", strings.Repeat("x", maxQRText+1)); rec.Code != http.StatusBadRequest {
		t.Fatalf("too long: %d", rec.Code)
	}
}

func urlQueryEscape(s string) string {
	var b strings.Builder
	for _, c := range []byte(s) {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' {
			b.WriteByte(c)
		} else {
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}

func TestConnectPageOffersOnlineAndQuestQR(t *testing.T) {
	ca, _, _ := loadOrCreateCA(t.TempDir())
	s := newServer(testApp(t), ca, 8080, 8443)
	page := func(p string) string {
		r := httptest.NewRequest("GET", p, nil)
		r.RemoteAddr, r.Host = "127.0.0.1:1", "localhost:8080"
		rec := httptest.NewRecorder()
		s.handler(false).ServeHTTP(rec, r)
		return rec.Body.String()
	}
	if b := page("/verbinden"); strings.Contains(b, `id="online"`) || !strings.Contains(b, `id="wifiForm"`) || !strings.Contains(b, `id="c-ready"`) {
		t.Fatal("without a public URL there is no online card; Wi-Fi form and checklist always")
	}
	s.publicURL = "https://fatmaku.github.io/Notion/window-blaster/"
	b := page("/verbinden")
	if !strings.Contains(b, `id="online" hidden`) || !strings.Contains(b, `id="questQr"`) {
		t.Fatal("online card (hidden until the live check) and Quest QR expected")
	}
	if !strings.Contains(b, `PUBLIC_URL = "https://fatmaku.github.io/Notion/window-blaster/"`) {
		t.Fatal("public URL must be embedded for the live check")
	}
	if got := questLaunchURL(s.publicURL); got != "https://www.oculus.com/open_url/?url=https%3A%2F%2Ffatmaku.github.io%2FNotion%2Fwindow-blaster%2F" {
		t.Fatalf("quest url %s", got)
	}
	if h := page("/handy"); !strings.Contains(h, `PUBLIC_URL = "https://fatmaku.github.io/Notion/window-blaster/"`) || !strings.Contains(h, `id="headset"`) {
		t.Fatal("phone page must embed the public URL and have a headset section")
	}
	// plain-http public URL: no Quest QR (Meta's Web Launch needs https)
	s.publicURL = "http://127.0.0.1:9/"
	if b := page("/verbinden"); strings.Contains(b, `id="questQr"`) {
		t.Fatal("quest QR for an http URL")
	}
}

func TestDeviceNames(t *testing.T) {
	for ua, want := range map[string]string{
		"Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/37.0 SamsungBrowser/4.0 Chrome/132.0 VR Safari/537.36": "Headset",
		"Mozilla/5.0 (Linux; Android 12; A9210 Build/SKQ1) AppleWebKit/537.36 (KHTML, like Gecko) PicoBrowser/4.1 Chrome/120.0 VR Mobile Safari/537.36":       "Headset",
		"Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1":                      "iPad",
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)":                                                                                              "iPhone",
		"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36":                                   "Android",
	} {
		if got := deviceFrom(ua); got != want {
			t.Fatalf("%s → %s, want %s", ua, got, want)
		}
	}
}

func TestAddrWatcherPrintsNewSetupAddress(t *testing.T) {
	var mu sync.Mutex
	cur := []localAddr{{IP: "192.168.178.20", Iface: "en0", Kind: "wifi"}}
	list := func() []localAddr {
		mu.Lock()
		defer mu.Unlock()
		return append([]localAddr(nil), cur...)
	}
	set := func(a ...localAddr) {
		mu.Lock()
		cur = a
		mu.Unlock()
	}
	var out bytes.Buffer
	w := newAddrWatcher(list, &out, 8080, false)
	if w.check() || out.Len() != 0 {
		t.Fatal("no change, no output")
	}
	set(localAddr{IP: "192.168.2.1", Iface: "bridge100", Kind: "sharing"}, localAddr{IP: "10.0.0.4", Iface: "en5", Kind: "ethernet"})
	if !w.check() {
		t.Fatal("change not noticed")
	}
	s := out.String()
	if !strings.Contains(s, "🔄 Neue Adresse") || !strings.Contains(s, "http://192.168.2.1:8080/handy") || !strings.Contains(s, "http://10.0.0.4:8080/handy") || !strings.Contains(s, "█") {
		t.Fatalf("output: %s", s)
	}
	out.Reset()
	if w.check() {
		t.Fatal("printed twice for the same addresses")
	}
	set()
	w.check()
	if !strings.Contains(out.String(), "keinem Netzwerk") {
		t.Fatalf("offline: %s", out.String())
	}
	// quiet: address line, no QR; the polling loop stops on request and is race-free
	out.Reset()
	q := newAddrWatcher(list, &out, 8080, true)
	stop := make(chan struct{})
	done := make(chan struct{})
	go func() { q.run(stop, 5*time.Millisecond); close(done) }()
	set(localAddr{IP: "192.168.178.21", Iface: "en0", Kind: "wifi"})
	deadline := time.Now().Add(2 * time.Second)
	for {
		outMu.Lock()
		got := out.String()
		outMu.Unlock()
		if strings.Contains(got, "http://192.168.178.21:8080/handy") {
			if strings.Contains(got, "█") {
				t.Fatal("quiet must not print a QR code")
			}
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("watcher did not print: %q", got)
		}
		time.Sleep(5 * time.Millisecond)
	}
	close(stop)
	<-done
}
