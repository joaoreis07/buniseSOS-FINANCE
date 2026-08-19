"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  exportProfessionalReportCsvAction,
  getProfessionalReportAction,
} from "../actions/business-reports.actions";
import { downloadReportPdf } from "../lib/report-pdf";
import type {
  ProfessionalReportDTO,
  ProfessionalReportType,
} from "../services/business-reports.service";

const REPORT_TYPES: Array<{ value: ProfessionalReportType; label: string; hint: string }> = [
  { value: "GENERAL", label: "Visão geral", hint: "Entradas, saídas e lucro do período" },
  { value: "INCOME", label: "Só entradas", hint: "O que entrou no caixa" },
  { value: "EXPENSE", label: "Só saídas", hint: "O que saiu do caixa" },
  { value: "INSTALLMENTS", label: "Parcelas", hint: "O que os clientes ainda devem" },
  { value: "CUSTOMERS", label: "Por cliente", hint: "Quem mais comprou" },
  { value: "CATEGORIES", label: "Por categoria", hint: "Onde o dinheiro está" },
];

const selectTriggerClass = "h-10 w-full rounded-xl";

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function endOfMonth(date = new Date()): string {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return toInputDate(last);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toInputDate(date);
}

type PeriodPreset = "this_month" | "last_month" | "last_30" | "custom";

function resolvePreset(from: string, to: string): PeriodPreset {
  const today = toInputDate(new Date());
  if (from === startOfMonth() && to === today) return "this_month";
  const last = new Date();
  last.setMonth(last.getMonth() - 1);
  if (from === startOfMonth(last) && to === endOfMonth(last)) return "last_month";
  if (from === daysAgo(30) && to === today) return "last_30";
  return "custom";
}

export function BusinessReportsView({
  initialReport,
  customers,
  categories,
}: {
  initialReport: ProfessionalReportDTO;
  customers: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}) {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState(initialReport);
  const [generated, setGenerated] = useState(true);
  const [type, setType] = useState<ProfessionalReportType>("GENERAL");
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(toInputDate(new Date()));
  const [customerId, setCustomerId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState("");
  const [showExtraFilters, setShowExtraFilters] = useState(false);

  const periodPreset = useMemo(() => resolvePreset(from, to), [from, to]);

  const filters = {
    type,
    from,
    to,
    customerId: customerId || undefined,
    categoryId: categoryId || undefined,
    paymentMethod: paymentMethod || undefined,
    status: status || undefined,
  };

  const applyPreset = (preset: PeriodPreset) => {
    const today = toInputDate(new Date());
    if (preset === "this_month") {
      setFrom(startOfMonth());
      setTo(today);
      return;
    }
    if (preset === "last_month") {
      const last = new Date();
      last.setMonth(last.getMonth() - 1);
      setFrom(startOfMonth(last));
      setTo(endOfMonth(last));
      return;
    }
    if (preset === "last_30") {
      setFrom(daysAgo(30));
      setTo(today);
    }
  };

  const generatePdf = () => {
    if (!from || !to) {
      toast.error("Informe as datas De e Até");
      return;
    }
    if (from > to) {
      toast.error("A data inicial não pode ser depois da data final");
      return;
    }

    startTransition(async () => {
      try {
        const data = await getProfessionalReportAction(filters);
        setReport(data);
        setGenerated(true);
        await downloadReportPdf(data);
        toast.success("PDF pronto! O arquivo foi baixado.");
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        console.error(error);
        toast.error("Não foi possível gerar o PDF. Tente de novo.");
      }
    });
  };

  const previewOnly = () => {
    startTransition(async () => {
      try {
        const data = await getProfessionalReportAction(filters);
        setReport(data);
        setGenerated(true);
        toast.success("Relatório atualizado na tela");
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        toast.error("Não foi possível gerar o relatório");
      }
    });
  };

  const exportExcel = () => {
    startTransition(async () => {
      try {
        const result = await exportProfessionalReportCsvAction(filters);
        const blob = new Blob([`\uFEFF${result.csv}`], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename.replace(/\.csv$/i, ".csv");
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Planilha baixada (abre no Excel)");
      } catch {
        toast.error("Falha ao baixar a planilha");
      }
    });
  };

  const headers = report.rows[0] ? Object.keys(report.rows[0]) : [];
  const selectedType = REPORT_TYPES.find((item) => item.value === type);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em]">Relatórios</h2>
        <p className="mt-1 text-sm text-slate-500">
          Escolha o tipo e o período, depois clique em <strong>Gerar PDF</strong>. O arquivo baixa
          sozinho no seu computador.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-blue-600" />
          <p>
            <strong className="font-semibold">Como usar:</strong> 1) escolha o tipo · 2) escolha o
            período · 3) clique em <strong>Gerar PDF</strong>. Pronto.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label>O que você quer ver?</Label>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {REPORT_TYPES.map((item) => {
                const active = type === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setType(item.value)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-blue-600 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${active ? "text-blue-700" : "text-slate-900"}`}>
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Período</Label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["this_month", "Este mês"],
                  ["last_month", "Mês passado"],
                  ["last_30", "Últimos 30 dias"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyPreset(id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    periodPreset === id
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-1 grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="report-from">De</Label>
                <Input
                  id="report-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="report-to">Até</Label>
                <Input
                  id="report-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
              onClick={() => setShowExtraFilters((current) => !current)}
            >
              <Filter className="size-4" />
              {showExtraFilters ? "Ocultar filtros extras" : "Filtros extras (opcional)"}
            </button>

            {showExtraFilters ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <Select
                    value={status || "__all__"}
                    onValueChange={(value) => setStatus(value === "__all__" ? "" : value)}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      <SelectItem value="PAID">Pago</SelectItem>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="OVERDUE">Vencido</SelectItem>
                      <SelectItem value="CANCELED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Forma de pagamento</Label>
                  <Select
                    value={paymentMethod || "__all__"}
                    onValueChange={(value) => setPaymentMethod(value === "__all__" ? "" : value)}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="CASH">Dinheiro</SelectItem>
                <SelectItem value="CARD_CREDIT">Cartão de crédito</SelectItem>
                <SelectItem value="CARD_DEBIT">Cartão de débito</SelectItem>
                <SelectItem value="CARD">Cartão</SelectItem>
                <SelectItem value="TED">TED</SelectItem>
                <SelectItem value="BOLETO">Boleto</SelectItem>
                <SelectItem value="OTHER">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Cliente</Label>
                  <Select
                    value={customerId || "__all__"}
                    onValueChange={(value) => setCustomerId(value === "__all__" ? "" : value)}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {customers.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={categoryId || "__all__"}
                    onValueChange={(value) => setCategoryId(value === "__all__" ? "" : value)}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {categories.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="h-12 flex-1 rounded-xl bg-blue-600 text-base hover:bg-blue-700"
              onClick={generatePdf}
              disabled={pending}
            >
              <FileText className="mr-2 size-5" />
              {pending ? "Gerando PDF..." : "Gerar PDF"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl"
              onClick={previewOnly}
              disabled={pending}
            >
              Só ver na tela
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl"
              onClick={exportExcel}
              disabled={pending}
            >
              <FileSpreadsheet className="mr-2 size-4" />
              Excel
            </Button>
          </div>
        </div>
      </section>

      <div ref={resultsRef} className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.03em]">
              {generated ? report.title : "Prévia do relatório"}
            </h3>
            <p className="text-sm text-slate-500">
              {selectedType?.hint} · {report.periodLabel}
              {report.rows.length === 0 ? " · nenhum lançamento neste filtro" : ` · ${report.rows.length} linha(s)`}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={generatePdf}
            disabled={pending}
          >
            <Download className="mr-2 size-4" />
            Baixar PDF de novo
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Receita", report.summary.formattedRevenue],
            ["Despesas", report.summary.formattedExpenses],
            ["Lucro", report.summary.formattedProfit],
            ["A receber", report.summary.formattedReceivable],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p
                className={`mt-2 text-lg font-semibold ${
                  label === "Lucro" && report.summary.profit < 0 ? "text-rose-600" : ""
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {headers.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="px-4 py-3 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      {headers.map((header) => (
                        <td key={header} className="px-4 py-3 text-slate-700">
                          {String(row[header] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
            <p className="font-medium text-slate-800">Nada para mostrar neste período</p>
            <p className="mt-1 text-sm text-slate-500">
              Troque as datas ou o tipo e clique em Gerar PDF de novo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
