export function getRomanMonth(monthZeroIndexed: number): string {
  const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return romanMonths[monthZeroIndexed] || "VII";
}

export function generateSuggestedInvoiceNumber(existingCount: number, dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const romanMonth = getRomanMonth(d.getMonth());
  const seq = String(existingCount + 1).padStart(3, "0");
  return `INV/${seq}/BSM/INV${romanMonth}/${year}`;
}

export function generateSuggestedBLNumber(existingCount: number, dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const yearShort = String(d.getFullYear()).slice(-2);
  const monthTwoDigits = String(d.getMonth() + 1).padStart(2, "0");
  const dayTwoDigits = String(d.getDate()).padStart(2, "0");
  const seq = String(existingCount + 1).padStart(3, "0");
  return `BSMKIJ${yearShort}${monthTwoDigits}${dayTwoDigits}${seq}`;
}

export function generateSuggestedSINumber(existingCount: number, dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const yearShort = String(d.getFullYear()).slice(-2);
  const romanMonth = getRomanMonth(d.getMonth());
  const seq = String(existingCount + 1);
  return `${seq}/BSM/SI/${romanMonth}/${yearShort}`;
}
