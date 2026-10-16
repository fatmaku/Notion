import re,os,json,sys
D=sys.argv[1]
names="""truck container package package-check package-open package-x arrow-up-from-line arrow-down-to-line file-check camera signature pen-line message-square-text triangle-alert phone navigation history house settings users plus search bell log-out languages clock lock map-pin calendar chart-column building-2 key-round route warehouse forklift thermometer-snowflake flame undo-2 check x chevron-right chevron-left chevron-down circle-check-big qr-code share-2 download upload image trash-2 pencil copy eye wifi-off refresh-cw moon sun shield-check receipt-text badge-euro gauge wrench user-plus id-card printer file-text boxes hand traffic-cone siren ban user-x circle-alert info sparkles layout-dashboard list-checks bell-ring square-pen arrow-right arrow-left external-link store crown wallet circle-pause scan-line hourglass circle-dot timer octagon-x smartphone tablet monitor map play rotate-ccw mail send building handshake star zap layers palette filter calendar-clock circle-user grip-vertical menu ellipsis circle-help door-closed weight snowflake box archive file-down link scale columns-2""".split()
out={}
for n in names:
    s=open(os.path.join(D,n+'.svg')).read()
    inner=re.search(r'<svg[^>]*>\s*(.*)</svg>',s,re.S).group(1)
    inner=re.sub(r'\s+',' ',inner).replace(' />','/>').strip()
    out[n]=inner
js="""// Icon set: Lucide (ISC License, https://lucide.dev) – only the icons the app uses.
// icon('truck') returns inline SVG markup; size and stroke follow CSS (.ic).
const P = %s;

export function icon(name, cls = '') {
  const p = P[name] || P['circle-help'];
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${p}</svg>`;
}
export const ICON_NAMES = Object.keys(P);
""" % json.dumps(out, ensure_ascii=False, indent=0)
open('/home/user/Notion/ladeklar/web/js/icons.js','w').write(js)
print(len(out), len(js))
