package main

import (
	"fmt"
	"html/template"
	"strings"

	"rsc.io/qr"
)

// qrSVG renders text as an inline SVG QR code (black on white, quiet zone 4).
func qrSVG(text string) template.HTML {
	code, err := qr.Encode(text, qr.M)
	if err != nil {
		return template.HTML("")
	}
	n := code.Size
	const quiet = 4
	var b strings.Builder
	fmt.Fprintf(&b, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" shape-rendering="crispEdges" role="img" aria-label="QR-Code: %s"><rect width="100%%" height="100%%" fill="#fff"/><path fill="#000" d="`, n+2*quiet, n+2*quiet, template.HTMLEscapeString(text))
	for y := 0; y < n; y++ {
		for x := 0; x < n; x++ {
			if code.Black(x, y) {
				fmt.Fprintf(&b, "M%d %dh1v1h-1z", x+quiet, y+quiet)
			}
		}
	}
	b.WriteString(`"/></svg>`)
	return template.HTML(b.String())
}

// qrTerminal renders text as a QR code with Unicode half blocks. Colours are
// forced (black on white) so it scans in light and dark Terminal themes.
func qrTerminal(text string) string {
	code, err := qr.Encode(text, qr.M)
	if err != nil {
		return ""
	}
	n := code.Size
	const quiet = 2
	black := func(x, y int) bool {
		x -= quiet
		y -= quiet
		return x >= 0 && y >= 0 && x < n && y < n && code.Black(x, y)
	}
	total := n + 2*quiet
	var b strings.Builder
	for y := 0; y < total; y += 2 {
		b.WriteString("   \x1b[30;47m")
		for x := 0; x < total; x++ {
			top, bottom := black(x, y), black(x, y+1)
			switch {
			case top && bottom:
				b.WriteString("█")
			case top:
				b.WriteString("▀")
			case bottom:
				b.WriteString("▄")
			default:
				b.WriteString(" ")
			}
		}
		b.WriteString("\x1b[0m\n")
	}
	return b.String()
}
