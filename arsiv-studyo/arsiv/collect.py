"""Seçilen öğeleri bir klasörde toplar (kopyalamadan: sert bağ / sembolik bağ; istenirse kopya)."""
import csv
import os
import re
import shutil
from pathlib import Path

from . import config, db


def _safe(name):
    return re.sub(r"[^\w\-. ğüşöçıİĞÜŞÖÇ]+", "_", name).strip() or "koleksiyon"


def collect(con, item_ids, name, mode="link", dest=None, progress=print):
    """mode: link (sert bağ, olmazsa sembolik), symlink, copy. Klasör yolunu döndürür."""
    config.ensure_dirs()
    folder = Path(dest).expanduser() if dest else config.COLLECT / _safe(name)
    folder.mkdir(parents=True, exist_ok=True)
    items = db.get_items(con, list(item_ids))
    rows, ok, missing = [], 0, 0
    for it in items:
        src = it.get("path")
        if not src or not Path(src).exists():
            missing += 1
            rows.append([it["id"], it.get("filename"), it.get("created_at"), "", "yerelde yok"])
            continue
        stamp = (it.get("created_at") or "")[:10].replace("-", "")
        dst = folder / f"{stamp}_{it['social_score']:.0f}p_{Path(src).name}"
        if not dst.exists():
            try:
                if mode == "copy":
                    shutil.copy2(src, dst)
                elif mode == "symlink":
                    os.symlink(src, dst)
                else:
                    try:
                        os.link(src, dst)
                    except OSError:
                        os.symlink(src, dst)
            except OSError as e:
                rows.append([it["id"], it.get("filename"), it.get("created_at"), "", f"hata: {e}"])
                continue
        ok += 1
        rows.append([it["id"], it.get("filename"), it.get("created_at"), it.get("social_score"), str(dst)])
    with open(folder / "liste.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "dosya", "tarih", "puan", "yol"])
        w.writerows(rows)
    progress(f"{ok} dosya toplandı → {folder}  (yerelde olmayan: {missing})")
    return {"klasor": str(folder), "toplanan": ok, "eksik": missing}
