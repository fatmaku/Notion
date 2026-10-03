package main

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// localCA is a tiny certificate authority whose root the user installs once on
// the phone. Leaf certificates are minted on demand for whatever name or IP
// the phone connects to, so a changed Wi-Fi address never breaks HTTPS.
type localCA struct {
	cert *x509.Certificate
	der  []byte
	key  crypto.Signer

	mu     sync.Mutex
	leaves map[string]*tls.Certificate
}

const (
	caCertFile = "ca.crt"
	caKeyFile  = "ca.key"
)

// loadOrCreateCA reads the CA from dir or creates a new one. created reports a fresh CA.
func loadOrCreateCA(dir string) (*localCA, bool, error) {
	certPath := filepath.Join(dir, caCertFile)
	keyPath := filepath.Join(dir, caKeyFile)
	if ca, err := readCA(certPath, keyPath); err == nil {
		return ca, false, nil
	} else if !errors.Is(err, os.ErrNotExist) {
		log.Printf("Vorhandenes Zertifikat unbrauchbar (%v) – erstelle ein neues.", err)
	}
	ca, err := createCA()
	if err != nil {
		return nil, false, err
	}
	keyDER, err := x509.MarshalPKCS8PrivateKey(ca.key)
	if err != nil {
		return nil, false, err
	}
	if err := os.WriteFile(keyPath, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyDER}), 0o600); err != nil {
		return nil, false, err
	}
	if err := os.WriteFile(certPath, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: ca.der}), 0o644); err != nil {
		return nil, false, err
	}
	return ca, true, nil
}

func readCA(certPath, keyPath string) (*localCA, error) {
	certPEM, err := os.ReadFile(certPath)
	if err != nil {
		return nil, err
	}
	keyPEM, err := os.ReadFile(keyPath)
	if err != nil {
		return nil, err
	}
	cb, _ := pem.Decode(certPEM)
	kb, _ := pem.Decode(keyPEM)
	if cb == nil || kb == nil {
		return nil, fmt.Errorf("PEM-Daten beschädigt")
	}
	cert, err := x509.ParseCertificate(cb.Bytes)
	if err != nil {
		return nil, err
	}
	signer, err := parseKey(kb)
	if err != nil {
		return nil, err
	}
	if !cert.IsCA {
		return nil, fmt.Errorf("kein CA-Zertifikat")
	}
	if !samePublicKey(cert, signer) {
		return nil, fmt.Errorf("Schlüssel passt nicht zum Zertifikat")
	}
	if time.Until(cert.NotAfter) < 30*24*time.Hour {
		return nil, fmt.Errorf("Zertifikat läuft bald ab")
	}
	return &localCA{cert: cert, der: cb.Bytes, key: signer, leaves: map[string]*tls.Certificate{}}, nil
}

// parseKey accepts PKCS#8 (ours) and SEC1 "EC PRIVATE KEY".
func parseKey(b *pem.Block) (crypto.Signer, error) {
	if k, err := x509.ParsePKCS8PrivateKey(b.Bytes); err == nil {
		if s, ok := k.(crypto.Signer); ok {
			return s, nil
		}
		return nil, fmt.Errorf("unbekannter Schlüsseltyp")
	}
	if k, err := x509.ParseECPrivateKey(b.Bytes); err == nil {
		return k, nil
	}
	return nil, fmt.Errorf("Schlüssel nicht lesbar")
}

func samePublicKey(cert *x509.Certificate, key crypto.Signer) bool {
	type equaler interface{ Equal(crypto.PublicKey) bool }
	pub, ok := key.Public().(equaler)
	return ok && pub.Equal(cert.PublicKey)
}

func createCA() (*localCA, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	host := shortHostname()
	tmpl := &x509.Certificate{
		SerialNumber: randomSerial(),
		Subject: pkix.Name{
			// the date makes a re-created CA distinguishable in the phone's trust settings
			CommonName:         fmt.Sprintf("Window Blaster Mac %s (%s)", host, time.Now().Format("2006-01-02")),
			Organization:       []string{"Window Blaster (lokal)"},
			OrganizationalUnit: []string{"Nur für das Spiel auf diesem Mac"},
		},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().AddDate(3, 0, 0),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign | x509.KeyUsageDigitalSignature,
		BasicConstraintsValid: true,
		IsCA:                  true,
		MaxPathLenZero:        true,
		// Only valid for addresses in the local network – never for real websites.
		PermittedDNSDomainsCritical: true,
		PermittedDNSDomains:         []string{"local", "localhost"},
		PermittedIPRanges:           localRanges(),
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		return nil, err
	}
	cert, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, err
	}
	return &localCA{cert: cert, der: der, key: key, leaves: map[string]*tls.Certificate{}}, nil
}

// localRanges are the address ranges the CA may issue for: private, CGNAT (some
// hotspots), link-local and loopback IPv4.
func localRanges() []*net.IPNet {
	var out []*net.IPNet
	for _, c := range []string{"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "100.64.0.0/10", "169.254.0.0/16", "127.0.0.0/8"} {
		_, n, _ := net.ParseCIDR(c)
		out = append(out, n)
	}
	return out
}

// allowedName reports whether a leaf may be issued for name (mirrors the CA's constraints,
// so a stranger on the Wi-Fi cannot make the server mint certificates for real domains).
func allowedName(name string) bool {
	if ip := net.ParseIP(name); ip != nil {
		for _, n := range localRanges() {
			if n.Contains(ip) {
				return true
			}
		}
		return false
	}
	return name == "localhost" || (strings.HasSuffix(name, ".local") && len(name) <= 253 && !strings.ContainsAny(name, " /\\"))
}

func randomSerial() *big.Int {
	n, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 126))
	if err != nil {
		return big.NewInt(time.Now().UnixNano())
	}
	return n.Add(n, big.NewInt(1))
}

// Fingerprint returns the SHA-256 fingerprint of the root (for the connect page).
func (ca *localCA) Fingerprint() string {
	sum := sha256.Sum256(ca.der)
	parts := make([]string, 0, 8)
	for i := 0; i < 8; i++ {
		parts = append(parts, fmt.Sprintf("%02X", sum[i]))
	}
	return strings.Join(parts, ":")
}

// uuidFrom derives a stable RFC 4122-shaped UUID from the CA and a label.
func (ca *localCA) uuidFrom(label string) string {
	sum := sha256.Sum256(append(append([]byte{}, ca.der...), label...))
	b := sum[:16]
	b[6] = (b[6] & 0x0f) | 0x50
	b[8] = (b[8] & 0x3f) | 0x80
	return strings.ToUpper(fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16]))
}

func (ca *localCA) tlsConfig() *tls.Config {
	return &tls.Config{
		MinVersion:     tls.VersionTLS12,
		GetCertificate: ca.getCertificate,
		NextProtos:     []string{"h2", "http/1.1"},
	}
}

// getCertificate picks the name the client asked for (SNI) or, for plain IP
// connections without SNI, the local IP address the connection arrived on.
func (ca *localCA) getCertificate(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	name := strings.ToLower(strings.TrimSuffix(hello.ServerName, "."))
	if name == "" && hello.Conn != nil {
		if ta, ok := hello.Conn.LocalAddr().(*net.TCPAddr); ok {
			if v4 := ta.IP.To4(); v4 != nil {
				name = v4.String()
			} else {
				name = ta.IP.String()
			}
		}
	}
	if name == "" || !allowedName(name) {
		name = "localhost" // unknown names get a cert that simply won't match – no minting for strangers
	}
	return ca.leafFor(name)
}

func (ca *localCA) leafFor(name string) (*tls.Certificate, error) {
	ca.mu.Lock()
	defer ca.mu.Unlock()
	if c, ok := ca.leaves[name]; ok && time.Until(c.Leaf.NotAfter) > 24*time.Hour {
		return c, nil
	}
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	tmpl := &x509.Certificate{
		SerialNumber: randomSerial(),
		Subject:      pkix.Name{CommonName: name, Organization: []string{"Window Blaster (lokal)"}},
		NotBefore:    time.Now().Add(-time.Hour),
		// Apple requires ≤ 825 days for TLS server certificates; keep well below.
		NotAfter:    time.Now().AddDate(1, 0, 0),
		KeyUsage:    x509.KeyUsageDigitalSignature,
		ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}
	if ip := net.ParseIP(name); ip != nil {
		tmpl.IPAddresses = []net.IP{ip}
	} else {
		tmpl.DNSNames = []string{name}
	}
	if name != "localhost" {
		tmpl.DNSNames = append(tmpl.DNSNames, "localhost")
	}
	tmpl.IPAddresses = append(tmpl.IPAddresses, net.IPv4(127, 0, 0, 1))
	der, err := x509.CreateCertificate(rand.Reader, tmpl, ca.cert, &key.PublicKey, ca.key)
	if err != nil {
		return nil, err
	}
	leaf, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, err
	}
	c := &tls.Certificate{Certificate: [][]byte{der}, PrivateKey: key, Leaf: leaf}
	if len(ca.leaves) >= 64 {
		ca.leaves = map[string]*tls.Certificate{} // bounded: a stranger cycling names cannot grow memory
	}
	ca.leaves[name] = c
	return c, nil
}

// quietTLSLog drops the noisy "TLS handshake error" lines a phone produces
// while it does not trust the certificate yet.
func quietTLSLog() *log.Logger {
	return log.New(filterWriter{w: os.Stderr}, "", 0)
}

type filterWriter struct{ w io.Writer }

func (f filterWriter) Write(p []byte) (int, error) {
	if strings.Contains(string(p), "TLS handshake error") {
		return len(p), nil
	}
	return f.w.Write(p)
}
