package main

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"strings"
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
