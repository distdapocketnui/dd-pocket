/** Try to parse various date formats to Date:
 *  - "DD/MM/YYYY HH:mm" (or with dot separator)
 *  - "DD/MM/YYYY"
 *  - "YYYY-MM-DD HH:mm" (ISO-like)
 *  - "YYYY-MM-DDTHH:mm" (datetime-local)
 */
export function parseIndonesianDate(str: string): Date | null {
  if (!str) return null;

  // Try "DD/MM/YYYY HH:mm" or "DD/MM/YYYY HH.mm" (Indonesian locale uses dots)
  let parts = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2})[:.](\d{2}))?/);
  if (parts) {
    const [, d, m, y, hh, mm] = parts;
    return new Date(
      parseInt(y),
      parseInt(m) - 1,
      parseInt(d),
      hh ? parseInt(hh) : 0,
      mm ? parseInt(mm) : 0,
    );
  }

  // Try "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm" (ISO-like from seed data / datetime-local)
  parts = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (parts) {
    const [, y, m, d, hh, mm] = parts;
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm));
  }

  return null;
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${m}/${y} ${hh}:${mm}`;
}

/** Convert any known date format to "YYYY-MM-DDTHH:mm" (datetime-local) */
export function toDatetimeLocal(datetime: string): string {
  if (!datetime) return "";

  // Already in datetime-local format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(datetime)) return datetime;

  // ISO-like with space: "YYYY-MM-DD HH:mm" (from seed data)
  let m = datetime.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;

  // ISO date only: "YYYY-MM-DD"
  m = datetime.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T00:00`;

  // Indonesian: "DD/MM/YYYY HH:mm" or "DD/MM/YYYY HH.mm"
  m = datetime.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2})[:.](\d{2})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}`;

  // Indonesian date only: "DD/MM/YYYY"
  m = datetime.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}T00:00`;

  // Fallback: try Date parsing
  const d = new Date(datetime);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${day}T${hh}:${mm}`;
  }

  return "";
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
