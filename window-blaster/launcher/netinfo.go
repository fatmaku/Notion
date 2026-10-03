package main

import (
	"net"
	"os"
	"os/exec"
	"runtime"
	"sort"
	"strings"
)

type localAddr struct {
	IP    string `json:"ip"`
	Iface string `json:"iface"`
	Kind  string `json:"kind"` // wifi | sharing | ethernet | other
	rank  int
}

// localIPv4s lists the Mac's reachable IPv4 addresses, best first:
// Wi-Fi (en0), Internet Sharing bridge (192.168.2.1), other en*, rest.
// Loopback, link-local, VPN/tunnel and virtual-machine interfaces are skipped.
func localIPv4s() []localAddr {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	seen := map[string]bool{}
	var out []localAddr
	for _, ifc := range ifaces {
		if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
			continue
		}
		name := ifc.Name
		if skipIface(name) {
			continue
		}
		addrs, err := ifc.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			ipn, ok := a.(*net.IPNet)
			if !ok {
				continue
			}
			v4 := ipn.IP.To4()
			if v4 == nil || v4.IsLoopback() || v4.IsLinkLocalUnicast() {
				continue
			}
			ip := v4.String()
			if seen[ip] {
				continue
			}
			seen[ip] = true
			la := localAddr{IP: ip, Iface: name}
			switch {
			case name == "en0":
				la.Kind, la.rank = "wifi", 0
			case strings.HasPrefix(name, "bridge") && strings.HasPrefix(ip, "192.168.2."):
				la.Kind, la.rank = "sharing", 1
			case strings.HasPrefix(name, "en"):
				la.Kind, la.rank = "ethernet", 2
			case strings.HasPrefix(name, "wl") || strings.HasPrefix(name, "eth"):
				la.Kind, la.rank = "wifi", 2
			default:
				la.Kind, la.rank = "other", 5
			}
			if !v4.IsPrivate() {
				la.rank += 3
			}
			out = append(out, la)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].rank < out[j].rank })
	return out
}

func skipIface(name string) bool {
	for _, p := range []string{"utun", "awdl", "llw", "gif", "stf", "anpi", "ap1", "vmnet", "vboxnet", "docker", "veth", "tailscale", "zt", "ipsec", "ppp"} {
		if strings.HasPrefix(name, p) {
			return true
		}
	}
	return false
}

// shortHostname is the Bonjour name of the Mac (without .local).
func shortHostname() string {
	if runtime.GOOS == "darwin" {
		if out, err := exec.Command("scutil", "--get", "LocalHostName").Output(); err == nil {
			if h := strings.TrimSpace(string(out)); h != "" {
				return h
			}
		}
	}
	h, err := os.Hostname()
	if err != nil || h == "" {
		return "mac"
	}
	if i := strings.IndexByte(h, '.'); i > 0 {
		h = h[:i]
	}
	return h
}
