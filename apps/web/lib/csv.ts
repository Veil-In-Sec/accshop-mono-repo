/** Downloads a CSV file in the browser. Values are quote-escaped. */
export function downloadCsv(
  filename: string,
  header: Array<string | number>,
  rows: Array<Array<string | number>>,
) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
