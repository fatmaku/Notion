# Übernimmt die Operationslisten der Lektoratsblöcke aus dem Arbeitsordner nach src/v6/straff/
# und wendet Herausgeber-Entscheidungen an: einzelne Kürzungen zurücknehmen (EXCLUDE),
# Nahtkorrekturen ergänzen (EXTRA). Jede Entscheidung mit Begründung.
import json, sys, glob, pathlib
SRC = pathlib.Path(sys.argv[1])            # Arbeitsordner mit ops_*_?.json
DST = pathlib.Path(__file__).parent / "straff"
DST.mkdir(exist_ok=True)
EXCLUDE = {   # (Schlüssel, pid, op) → Grund
 ("BY", 624, "replace"): "Leyla'nın şaman gelenekleri listesi kalıyor: 39. bölümdeki tekrarı (2791) zaten kısaltıldı; ikisi birden gidince „o geleneklerden“ dayanaksız kalıyordu.",
 ("BY", 2792, "delete"): "„ŞAMAN, bu yüzden bir kimlik değil, hatırlatma olmalıydı“ bölümün kısaltma (Ş-A-M-A-N) listesinin anahtar cümlesi; Leyla'nın „eşiği geçen ve geri dönen“ tanımını kapatıyor.",
}
EXTRA = {
 "BY": [],
 "SA": [],
}
for f in sorted(SRC.glob("ops_*_[A-F].json")):
    key = f.stem.split("_")[1]
    ops = json.load(open(f)); kept = []
    for o in ops:
        r = EXCLUDE.get((key, o.get("pid"), o.get("op")))
        if r:
            print(f"zurückgenommen {f.name} pid {o['pid']} {o['op']}: {r}")
            continue
        kept.append(o)
    json.dump(kept, open(DST / f.name, "w"), ensure_ascii=False, indent=0)
    print(f.name, len(ops), "→", len(kept))
for key, ops in EXTRA.items():
    json.dump(ops, open(DST / f"ops_{key}_Z.json", "w"), ensure_ascii=False, indent=0)
json.dump([{"key": k[0], "pid": k[1], "op": k[2], "neden": v} for k, v in EXCLUDE.items()],
          open(DST / "geri_alinanlar.json", "w"), ensure_ascii=False, indent=1)
