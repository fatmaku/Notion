package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// The previous download (v0.2) ran a bundled Caddy server on the same ports 8080/8443.
// It may still run in a forgotten Terminal window – after its folder went to the trash it
// answers every request with "404", and it blocks our ports. Its binaries were named
// caddy-darwin-arm64 / caddy-darwin-amd64 / caddy-linux-amd64, which identifies it safely.
var oldCaddy = regexp.MustCompile(`caddy-(darwin|linux)-(arm64|amd64)`)

// portHolders lists the processes listening on port (pid → command line); empty without lsof.
func portHolders(port int) map[int]string {
	out := map[int]string{}
	b, err := exec.Command("lsof", "-nP", "-t", fmt.Sprintf("-iTCP:%d", port), "-sTCP:LISTEN").Output()
	if err != nil {
		return out
	}
	for _, f := range strings.Fields(string(b)) {
		pid, err := strconv.Atoi(f)
		if err != nil || pid == os.Getpid() {
			continue
		}
		cmd, _ := exec.Command("ps", "-o", "command=", "-p", f).Output()
		out[pid] = strings.TrimSpace(string(cmd))
	}
	return out
}

// freeOldServers stops an old Window Blaster (Caddy) server on the given ports and reports
// any other program that holds one of them.
func freeOldServers(ports ...int) {
	for _, port := range ports {
		for pid, cmd := range portHolders(port) {
			if !oldCaddy.MatchString(cmd) {
				name := cmd
				if fields := strings.Fields(cmd); len(fields) > 0 {
					name = filepath.Base(fields[0])
				}
				fmt.Printf("⚠️  Port %d wird von einem anderen Programm benutzt: „%s“ (PID %d).\n", port, name, pid)
				continue
			}
			fmt.Printf("🧹 Die alte Window-Blaster-Version läuft noch im Hintergrund (Port %d) – sie wird beendet.\n", port)
			p, err := os.FindProcess(pid)
			if err != nil {
				continue
			}
			_ = p.Signal(syscall.SIGTERM)
			for i := 0; i < 30 && !portFree(port); i++ {
				time.Sleep(100 * time.Millisecond)
			}
			if !portFree(port) {
				_ = p.Signal(syscall.SIGKILL)
				for i := 0; i < 20 && !portFree(port); i++ {
					time.Sleep(100 * time.Millisecond)
				}
			}
		}
	}
}
