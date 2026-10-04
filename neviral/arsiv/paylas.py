"""Hazır üretimi iPhone'a ulaştırma: macOS Fotoğraflar'a 'Arşiv Stüdyo' albümüne aktarır; iCloud Fotoğraflar ile telefona gelir."""
import platform
import subprocess
from pathlib import Path

ALBUM = "neviral"
SCRIPT = [
    "on run argv",
    "set albumName to item 1 of argv",
    "set fileList to {}",
    "repeat with i from 2 to count of argv",
    "set end of fileList to (POSIX file (item i of argv))",
    "end repeat",
    'tell application "Photos"',
    "if not (exists album albumName) then make new album named albumName",
    "import fileList into album albumName skip check duplicates true",
    "end tell",
    "end run",
]


def files_for(output):
    p = Path(output)
    if p.is_dir():  # carousel: slaytlar
        return sorted(str(x) for x in p.glob("slayt-*.jpg"))
    return [str(p)] if p.is_file() else []


def add_to_photos(output, album=ALBUM):
    """(ok, mesaj). Yalnızca macOS; ilk seferde 'Terminal, Fotoğraflar'ı denetlemek istiyor' izni sorulur."""
    if platform.system() != "Darwin":
        return False, "Yalnızca macOS'ta çalışır"
    files = files_for(output)
    if not files:
        return False, "Dosya bulunamadı"
    args = ["osascript"]
    for line in SCRIPT:
        args += ["-e", line]
    r = subprocess.run(args + [album] + files, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        msg = (r.stderr or r.stdout).strip()[-300:]
        if "-1743" in msg or "not allowed" in msg.lower():
            msg = "İzin gerekli: Sistem Ayarları › Gizlilik ve Güvenlik › Otomasyon › Terminal › Fotoğraflar"
        return False, msg
    return True, f"{len(files)} dosya Fotoğraflar'daki '{album}' albümüne eklendi; iCloud ile iPhone'a gelecek"
