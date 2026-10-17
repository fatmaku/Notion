// CSV cells for Excel/LibreOffice (semicolon, German locale). Plain ESM without Node imports, so the
// server exports and the office UI in the browser escape every cell the same way.
//   toCsv([['Kunde', 'Paletten'], ['=Bosch', 3]])  →  'Kunde;Paletten\r\n\'=Bosch;3'
// No BOM: prepend '﻿' for Excel. Strings that start with = + - @ tab or CR get a leading ' so a
// spreadsheet shows them as text instead of running them as a formula (CSV injection); numbers stay.

const FORMULA = /^[=+\-@\t\r]/;

function cell(v, sep) {
  let s = v == null ? '' : String(v);
  if (typeof v === 'string' && FORMULA.test(s)) s = "'" + s;
  return s.includes(sep) || /["\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** One cell for a semicolon CSV (safe as a callback: row.map(csvCell)). */
export const csvCell = (v) => cell(v, ';');

/** Rows (arrays of cells) to CSV text with CRLF line ends. */
export function toCsv(rows, sep = ';') {
  return rows.map((r) => (r || []).map((v) => cell(v, sep)).join(sep)).join('\r\n');
}
