import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfData {
  title: string;
  period: string;
  columns: string[];
  rows: string[][];
  filename: string;
}

/** Export data table to A4 landscape PDF with header, footer, and signature */
export function downloadPdf({ title, period, columns, rows, filename }: PdfData) {
  const doc = new jsPDF("l", "mm", "a4");
  const pageW = 297; // A4 landscape width in mm
  const marginLeft = 20;
  const marginRight = 20;
  const contentW = pageW - marginLeft - marginRight;

  // Get current user for footer
  let userName = "System";
  try {
    const stored = localStorage.getItem("ddp_current_user");
    if (stored) {
      const u = JSON.parse(stored);
      if (u?.name) userName = u.name;
    }
  } catch {}

  const exportDate = new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // ===== Page count (will be updated after autoTable) =====
  let pageCount = 0;

  // ===== Header on each page =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, marginLeft, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Unit Distribusi Daya", marginLeft, 30);

  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(`Periode: ${period}`, marginLeft, 37);

  // Horizontal line under header
  doc.setDrawColor(200);
  doc.line(marginLeft, 40, pageW - marginRight, 40);

  // ===== Data table (starts at y=47) =====
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 47,
    margin: { left: marginLeft, right: marginRight },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    didDrawPage: () => {
      // Footer on each page
      pageCount = doc.getNumberOfPages();

      // Left footer
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text('© 2026 Unit Distribusi Daya — design by NUI6184', marginLeft, 200);

      // Center footer — page number
      doc.setFont("helvetica", "normal");
      const pageNum = doc.getCurrentPageInfo().pageNumber;
      doc.text(`Hal. ${pageNum} dari ${pageCount || 1}`, pageW / 2, 200, { align: "center" });

      // Right footer
      doc.setFont("helvetica", "normal");
      const rightText = `Diekspor pada: ${exportDate} — Oleh: ${userName}`;
      doc.text(rightText, pageW - marginRight, 200, { align: "right" });
    },
  });

  // ===== Signature block =====
  const finalY = (doc as any).lastAutoTable?.finalY || 47;

  // Only draw signature if there's enough room, otherwise new page
  if (finalY > 160) {
    doc.addPage();
  }

  const sigY = finalY + 30;

  // Horizontal line before signature
  doc.setDrawColor(200);
  doc.line(marginLeft, sigY - 10, marginLeft + 60, sigY - 10);

  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100);
  doc.text("Approved by", marginLeft, sigY);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Seksi Pengaturan Beban", marginLeft, sigY + 6);

  // ===== Update page count in footers =====
  pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i !== pageCount) {
      // Re-draw footer page count (since total pages changed)
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const leftText = '© 2026 Unit Distribusi Daya — design by NUI6184';
      doc.text(leftText, marginLeft, 200);
      doc.text(`Hal. ${i} dari ${pageCount}`, pageW / 2, 200, { align: "center" });
      const rightText = `Diekspor pada: ${exportDate} — Oleh: ${userName}`;
      doc.text(rightText, pageW - marginRight, 200, { align: "right" });
    }
  }

  doc.save(`${filename}.pdf`);
}
