import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { ProfessionalReportDTO } from "../services/business-reports.service";

function money(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatCell(value: string | number): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : money(value);
  }
  return value || "—";
}

export async function downloadReportPdf(report: ProfessionalReportDTO): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as {
    addVirtualFileSystem: (fonts: unknown) => void;
    createPdf: (doc: TDocumentDefinitions) => { download: (name?: string) => void };
  };
  const fonts = pdfFontsModule.default ?? pdfFontsModule;
  pdfMake.addVirtualFileSystem(fonts);

  const headers = report.rows[0] ? Object.keys(report.rows[0]) : [];
  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  const content: Content[] = [
    { text: "BusinessOS Finance", style: "brand" },
    { text: report.title, style: "title", margin: [0, 4, 0, 2] },
    { text: `Período: ${report.periodLabel}`, style: "muted" },
    { text: `Gerado em ${generatedAt}`, style: "muted", margin: [0, 0, 0, 16] },
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "Receita", style: "kpiLabel" },
            { text: report.summary.formattedRevenue, style: "kpiValue" },
          ],
        },
        {
          width: "*",
          stack: [
            { text: "Despesas", style: "kpiLabel" },
            { text: report.summary.formattedExpenses, style: "kpiValue" },
          ],
        },
        {
          width: "*",
          stack: [
            { text: "Lucro", style: "kpiLabel" },
            {
              text: report.summary.formattedProfit,
              style: "kpiValue",
              color: report.summary.profit < 0 ? "#e11d48" : "#0f172a",
            },
          ],
        },
        {
          width: "*",
          stack: [
            { text: "A receber", style: "kpiLabel" },
            { text: report.summary.formattedReceivable, style: "kpiValue" },
          ],
        },
      ],
      columnGap: 12,
      margin: [0, 0, 0, 18],
    },
  ];

  if (report.chart.length > 0) {
    const chartIsCount = report.title === "Parcelas";
    content.push(
      { text: "Resumo visual", style: "section", margin: [0, 0, 0, 8] },
      {
        ul: report.chart.map((item) => {
          const valueText = chartIsCount ? String(item.value) : money(item.value);
          return `${item.label}: ${valueText}`;
        }),
        margin: [0, 0, 0, 16],
      },
    );
  }

  if (headers.length > 0 && report.rows.length > 0) {
    content.push(
      { text: "Detalhes", style: "section", margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths: headers.map(() => "*"),
          body: [
            headers.map((header) => ({
              text: header,
              style: "tableHeader",
            })),
            ...report.rows.map((row) =>
              headers.map((header) => ({
                text: formatCell(row[header] ?? ""),
                style: "tableCell",
              })),
            ),
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f1f5f9" : rowIndex % 2 === 0 ? "#f8fafc" : null),
          hLineColor: () => "#e2e8f0",
          vLineColor: () => "#e2e8f0",
        },
      },
    );
  } else {
    content.push({
      text: "Nenhum lançamento encontrado neste período com os filtros escolhidos.",
      style: "muted",
      margin: [0, 8, 0, 0],
    });
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [36, 40, 36, 40],
    info: {
      title: report.title,
      author: "BusinessOS Finance",
      subject: `Relatório ${report.periodLabel}`,
    },
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      color: "#0f172a",
    },
    styles: {
      brand: { fontSize: 11, bold: true, color: "#2563eb" },
      title: { fontSize: 18, bold: true },
      muted: { fontSize: 9, color: "#64748b" },
      section: { fontSize: 12, bold: true },
      kpiLabel: { fontSize: 8, color: "#64748b", margin: [0, 0, 0, 2] },
      kpiValue: { fontSize: 11, bold: true },
      tableHeader: { bold: true, fontSize: 8, color: "#334155" },
      tableCell: { fontSize: 8 },
    },
    footer: (currentPage, pageCount) => ({
      text: `BusinessOS Finance · página ${currentPage} de ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      color: "#94a3b8",
      margin: [0, 10, 0, 0],
    }),
    content,
  };

  const filename = `relatorio-${slugify(report.title)}-${slugify(report.periodLabel)}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
}
