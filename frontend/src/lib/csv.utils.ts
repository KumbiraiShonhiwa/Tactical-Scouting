// Client-side CSV export for ExportButton (DV-06) — Phase 4 decision: no backend call, no
// server-side "generate-export" Edge Function yet (that's Phase 5). See the Phase 4 plan.

function escapeCsvCell(value: string | number | boolean | null): string {
  const str = value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(
  rows: Array<Record<string, string | number | boolean | null>>,
): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(",")),
  ];
  return lines.join("\r\n");
}
