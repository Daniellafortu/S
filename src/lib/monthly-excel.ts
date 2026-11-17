import ExcelJS from "exceljs";
import type { ParkingItem } from "@/lib/records";
import type { MonthReport } from "@/lib/types";

const dark = "FF064A31";
const green = "FF147A4A";
const light = "FFEAF5ED";
const muted = "FF6B7F70";
const currencyFormat = '"$" #,##0;[Red]-"$" #,##0';

function monthLabel(month: string) {
  const [year, number] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, number - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Excel stores a wall-clock value rather than a time zone. Colombia uses UTC-5.
function colombiaDate(date: Date | null) {
  return date ? new Date(date.getTime() - 5 * 60 * 60 * 1000) : null;
}

export async function monthlyExcel(report: MonthReport, movements: ParkingItem[], parkName: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = parkName;
  workbook.created = new Date();
  workbook.title = `${parkName} · Reporte mensual ${report.month}`;

  const summary = workbook.addWorksheet("Resumen mensual", { views: [{ state: "frozen", ySplit: 8 }] });
  summary.columns = [
    { width: 20 }, { width: 20 }, { width: 20 }, { width: 22 },
    { width: 20 }, { width: 21 }, { width: 18 },
  ];
  summary.mergeCells("A1:G1");
  summary.getCell("A1").value = `${parkName.toUpperCase()}  |  REPORTE MENSUAL`;
  summary.getCell("A1").font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  summary.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: dark } };
  summary.getCell("A1").alignment = { vertical: "middle", indent: 1 };
  summary.getRow(1).height = 34;
  summary.mergeCells("A2:G2");
  summary.getCell("A2").value = `${monthLabel(report.month)}  ·  Valores en pesos colombianos (COP)`;
  summary.getCell("A2").font = { name: "Calibri", size: 11, color: { argb: muted } };
  summary.getCell("A2").alignment = { vertical: "middle", indent: 1 };
  summary.getRow(2).height = 24;

  summary.getRow(4).values = ["Total recaudado", report.total, "En efectivo", report.cash, "En transferencia", report.transfer];
  summary.getRow(5).values = ["Motos atendidas", report.count, "Diferencia acumulada", report.difference];
  for (const rowNumber of [4, 5]) {
    const row = summary.getRow(rowNumber);
    row.height = 25;
    row.eachCell((cell, column) => {
      cell.font = { name: "Calibri", size: 11, bold: column % 2 === 0, color: { argb: column % 2 === 0 ? dark : muted } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: light } };
      cell.alignment = { vertical: "middle", indent: 1 };
    });
  }
  for (const address of ["B4", "D4", "F4", "D5"]) summary.getCell(address).numFmt = currencyFormat;
  summary.mergeCells("A7:G7");
  summary.getCell("A7").value = "RESUMEN POR DÍA";
  summary.getCell("A7").font = { name: "Calibri", size: 11, bold: true, color: { argb: dark } };
  summary.getRow(7).height = 22;
  summary.getRow(8).values = ["Fecha", "Motos atendidas", "Efectivo", "Transferencia", "Total", "Diferencia", "Cierre"];
  const header = summary.getRow(8);
  header.height = 24;
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: green } };
    cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", indent: 1 };
  });
  summary.autoFilter = "A8:G8";
  for (const [index, day] of report.days.entries()) {
    const row = summary.addRow([new Date(`${day.day}T00:00:00Z`), day.count, day.cash, day.transfer, day.total, day.difference, day.closed ? "Cerrado" : "Sin cerrar"]);
    row.height = 21;
    row.getCell(1).numFmt = "dd/mm/yyyy";
    for (const column of [3, 4, 5, 6]) row.getCell(column).numFmt = currencyFormat;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF304B38" } };
      cell.alignment = { vertical: "middle", indent: 1 };
      if (index % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6FAF6" } };
    });
  }
  const totalRow = summary.addRow(["TOTAL", report.count, report.cash, report.transfer, report.total, report.difference, ""]);
  totalRow.height = 25;
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: light } };
    cell.font = { name: "Calibri", bold: true, color: { argb: dark }, size: 10 };
    cell.alignment = { vertical: "middle", indent: 1 };
  });
  for (const column of [3, 4, 5, 6]) totalRow.getCell(column).numFmt = currencyFormat;

  const detail = workbook.addWorksheet("Movimientos", { views: [{ state: "frozen", ySplit: 4 }] });
  detail.columns = [
    { width: 16 }, { width: 21 }, { width: 21 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 24 }, { width: 24 }, { width: 18 }, { width: 55 },
  ];
  detail.mergeCells("A1:J1");
  detail.getCell("A1").value = `MOVIMIENTOS PAGADOS  |  ${monthLabel(report.month)}`;
  detail.getCell("A1").font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  detail.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: dark } };
  detail.getCell("A1").alignment = { vertical: "middle", indent: 1 };
  detail.getRow(1).height = 32;
  detail.mergeCells("A2:J2");
  detail.getCell("A2").value = "Registros pagados según la fecha de salida. Horarios en Colombia (UTC-5).";
  detail.getCell("A2").font = { name: "Calibri", size: 10, color: { argb: muted } };
  detail.getRow(2).height = 23;
  detail.getRow(4).values = ["Placa", "Entrada", "Salida", "Horas cobradas", "Valor cobrado", "Método de pago", "Cuidador entrada", "Cuidador salida", "Casco", "Comentarios"];
  detail.getRow(4).height = 24;
  detail.getRow(4).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: green } };
    cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", indent: 1 };
  });
  detail.autoFilter = "A4:J4";
  const commentDate = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  for (const [index, record] of movements.entries()) {
    const notes = record.comments.map((c) => `${commentDate.format(c.createdAt)} · ${c.author}: ${c.text}`).join("\n");
    const row = detail.addRow([record.plate, colombiaDate(record.enteredAt), colombiaDate(record.exitedAt), record.billableHours, record.amount,
      record.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia", record.entryUser, record.exitUser || "—",
      record.helmet === "si" ? "Sí" : record.helmet === "no" ? "No" : "Sin especificar", notes]);
    row.height = notes ? Math.min(90, Math.max(22, record.comments.length * 18)) : 21;
    row.getCell(2).numFmt = "dd/mm/yyyy hh:mm";
    row.getCell(3).numFmt = "dd/mm/yyyy hh:mm";
    row.getCell(5).numFmt = currencyFormat;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF304B38" } };
      cell.alignment = { vertical: "middle", indent: 1, wrapText: true };
      if (index % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6FAF6" } };
    });
  }
  return workbook.xlsx.writeBuffer();
}
