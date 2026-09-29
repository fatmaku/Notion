"""Inline fonts and images into one self-contained HTML file for easy sharing."""
import base64, re, pathlib
root = pathlib.Path(__file__).parent
b64 = lambda p, mime: f"data:{mime};base64," + base64.b64encode((root / p).read_bytes()).decode()
css = (root / "assets/fonts.css").read_text()
css = re.sub(r"url\((fonts/[^)]+)\)", lambda m: f"url({b64('assets/' + m.group(1), 'font/woff2')})", css)
html = (root / "index.html").read_text()
html = html.replace('<link rel="stylesheet" href="assets/fonts.css">', f"<style>{css}</style>")
for img in ("hero", "product", "tablet"):
    html = html.replace(f"assets/{img}.jpg", b64(f"assets/{img}.jpg", "image/jpeg"))
(root / "Aybal_Investor_Show.html").write_text(html)
print("wrote", len(html) // 1024, "KB")
