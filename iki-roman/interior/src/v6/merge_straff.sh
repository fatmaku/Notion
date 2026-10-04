#!/bin/bash
# Straffungs-Operationen aller Lektoratsblöcke + Herausgeber-Eingriffe zusammenführen.
#   YOLCU_TR_v4.docx          + ops_BY_*.json + ops_editor_BY.json → YOLCU_TR_v5.docx
#   v6/SAHIT_v6a_entegre.docx + ops_SA_*.json + ops_editor_SA.json → SAHIT_TR_v6.docx
set -euo pipefail
cd "$(dirname "$0")/../.."          # interior/
V=src/v6
python3 - <<'PY'
import json, glob
for key in ("BY", "SA"):
    ops = []
    for f in sorted(glob.glob(f"src/v6/straff/ops_{key}_[A-FZ].json")):
        ops += json.load(open(f))
    json.dump(ops, open(f"src/v6/straff/ops_{key}_alle.json", "w"), ensure_ascii=False, indent=0)
    print(key, len(ops), "Straffungs-Operationen")
PY
T=$(mktemp -d)
python3 tools/docx_ops.py src/YOLCU_TR_v4.docx $V/straff/ops_BY_alle.json $T/by.docx --locked $V/straff/BY_locked.json
python3 tools/docx_ops.py $T/by.docx $V/ops_editor_BY.json src/YOLCU_TR_v5.docx
python3 tools/docx_ops.py $V/SAHIT_v6a_entegre.docx $V/straff/ops_SA_alle.json $T/sa.docx --locked $V/straff/SA_locked.json
python3 tools/docx_ops.py $T/sa.docx $V/ops_editor_SA.json src/SAHIT_TR_v6.docx
python3 tools/check_text.py --by src/YOLCU_TR_v5.docx --sa src/SAHIT_TR_v6.docx --json $V/check_text_v6.json | tail -1
python3 tools/wordcount.py src/YOLCU_TR_v4.docx src/YOLCU_TR_v5.docx | tail -1
python3 tools/wordcount.py $V/SAHIT_v6a_entegre.docx src/SAHIT_TR_v6.docx | tail -1
# Gegenprüfung (vier unabhängige Prüfer): Nahtkorrekturen auf die neuen Fassungen
python3 - <<'PY'
import json
for key in ("BY", "SA"):
    ops = json.load(open(f"src/v6/review/fix_{key}_1.json")) + json.load(open(f"src/v6/review/fix_{key}_2.json"))
    json.dump(ops, open(f"src/v6/review/fix_{key}_alle.json", "w"), ensure_ascii=False, indent=0)
PY
python3 tools/docx_ops.py src/YOLCU_TR_v5.docx src/v6/review/fix_BY_alle.json $T/by2.docx && cp $T/by2.docx src/YOLCU_TR_v5.docx
python3 tools/docx_ops.py src/SAHIT_TR_v6.docx src/v6/review/fix_SA_alle.json $T/sa2.docx && cp $T/sa2.docx src/SAHIT_TR_v6.docx
python3 tools/check_text.py --by src/YOLCU_TR_v5.docx --sa src/SAHIT_TR_v6.docx --json $V/check_text_v6.json | tail -1
# Korrektorat (vier Korrektoren, pid auf dem Stand nach der Gegenprüfung) und Herausgeber-Runde 2 (Jury v6)
python3 - <<'PY'
import json, glob
for key in ("BY", "SA"):
    ops = []
    for f in sorted(glob.glob(f"src/v6/korrektur/kor_{key}_[0-9].json")):
        ops += json.load(open(f))
    json.dump(ops, open(f"src/v6/korrektur/kor_{key}_alle.json", "w"), ensure_ascii=False, indent=0)
PY
python3 tools/docx_ops.py src/YOLCU_TR_v5.docx src/v6/korrektur/kor_BY_alle.json $T/by3.docx --locked $V/straff/BY_locked_v6final.json
python3 tools/docx_ops.py $T/by3.docx $V/ops_editor2_BY.json src/YOLCU_TR_v5.docx
python3 tools/docx_ops.py src/SAHIT_TR_v6.docx src/v6/korrektur/kor_SA_alle.json $T/sa3.docx --locked $V/straff/SA_locked_v6final.json
python3 tools/docx_ops.py $T/sa3.docx $V/ops_editor2_SA.json src/SAHIT_TR_v6.docx
python3 tools/check_text.py --by src/YOLCU_TR_v5.docx --sa src/SAHIT_TR_v6.docx --json $V/check_text_v6.json | tail -1
python3 tools/wordcount.py src/YOLCU_TR_v4.docx src/YOLCU_TR_v5.docx | tail -1
python3 tools/wordcount.py $V/SAHIT_v6a_entegre.docx src/SAHIT_TR_v6.docx | tail -1
# Herausgeber-Runde 3 (Kontroll-Jury) und Vereinheitlichung der Redezeichen in ŞAHİT
python3 tools/docx_ops.py src/SAHIT_TR_v6.docx $V/ops_editor3_SA.json $T/sa4.docx
python3 $V/punct2_apply.py $T/sa4.docx src/SAHIT_TR_v6.docx $V/punct2_log.json
python3 tools/check_text.py --by src/YOLCU_TR_v5.docx --sa src/SAHIT_TR_v6.docx --json $V/check_text_v6.json | tail -1
