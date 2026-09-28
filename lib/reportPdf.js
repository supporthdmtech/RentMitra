import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "./dueDate";

// Builds the "Property Summary / Tenant Summary / Paid-Pending-Overdue"
// report entirely in the browser — no server round trip, no headless
// browser rendering.
export function downloadIncomeReportPdf({ rangeLabel, properties, totals }) {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text("RentMitra — Income Report", 14, y);
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(rangeLabel, 14, y);
  y += 12;

  doc.setTextColor(0);
  doc.setFontSize(13);
  doc.text("Summary", 14, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(`Total collected: ${formatCurrency(totals.paid)}`, 14, y);
  y += 6;
  doc.text(`Pending: ${formatCurrency(totals.pending)}`, 14, y);
  y += 6;
  doc.text(`Overdue: ${formatCurrency(totals.overdue)}`, 14, y);
  y += 12;

  doc.setFontSize(13);
  doc.text("Property breakdown", 14, y);
  y += 8;

  properties.forEach((p) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.text(p.name, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(
      `Collected ${formatCurrency(p.paid)} · Pending ${formatCurrency(
        p.pending
      )} · Overdue ${formatCurrency(p.overdue)} · Tenants ${p.tenantCount}`,
      18,
      y
    );
    doc.setTextColor(0);
    y += 9;
  });

  doc.save(`rentmitra-income-report-${formatDate(new Date())}.pdf`);
}
