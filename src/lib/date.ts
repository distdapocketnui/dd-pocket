/** Parse Indonesian date string "DD/MM/YYYY HH:mm" to Date */
export function parseIndonesianDate(str: string): Date | null {
  if (!str) return null;
  // Try "DD/MM/YYYY HH:mm" or "DD/MM/YYYY"
  const parts = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!parts) return null;
  const [, d, m, y, hh, mm] = parts;
  return new Date(
    parseInt(y),
    parseInt(m) - 1,
    parseInt(d),
    hh ? parseInt(hh) : 0,
    mm ? parseInt(mm) : 0,
  );
}

/** Check if a date string falls within a date range (inclusive) */
export function isInRange(dateStr: string, startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) return true;
  const date = parseIndonesianDate(dateStr);
  if (!date) return true; // can't parse, show it

  // Normalize filter dates to start/end of day
  if (startDate) {
    const start = new Date(startDate + "T00:00:00");
    if (date < start) return false;
  }
  if (endDate) {
    const end = new Date(endDate + "T23:59:59");
    if (date > end) return false;
  }
  return true;
}

/** Convert "YYYY-MM-DDTHH:mm" (datetime-local) to Indonesian format "DD/MM/YYYY HH:mm" */
export function toIndonesianDate(datetime: string): string {
  if (!datetime) return "";
  const d = new Date(datetime + ":00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Convert Indonesian date "DD/MM/YYYY HH:mm" to "YYYY-MM-DDTHH:mm" (datetime-local) */
export function toDatetimeLocal(datetime: string): string {
  if (!datetime) return "";
  const d = parseIndonesianDate(datetime);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

/** Get current datetime in "YYYY-MM-DDTHH:mm" format for datetime-local default */
export function getCurrentDatetimeLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

/** Format date range label for PDF */
export function formatPeriod(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return "Semua data";
  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };
  if (startDate && endDate) return `${fmt(startDate)} — ${fmt(endDate)}`;
  if (startDate) return `Mulai ${fmt(startDate)}`;
  return `Sampai ${fmt(endDate)}`;
}
