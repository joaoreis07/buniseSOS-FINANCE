"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  FileBarChart2,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Brand } from "@/shared/components/brand";
import { FinanceDashboard } from "@/modules/finance/components/finance-dashboard";

const revenueData = [
  { month: "Jan", value: 5200, profit: 3500 },
  { month: "Fev", value: 6800, profit: 4400 },
  { month: "Mar", value: 6100, profit: 4100 },
  { month: "Abr", value: 8600, profit: 5900 },
  { month: "Mai", value: 7800, profit: 5200 },
  { month: "Jun", value: 10240, profit: 7168 },
];

function Stat({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs font-medium text-emerald-600">
        ↑ {trend} <span className="font-normal text-slate-400">vs. mês anterior</span>
      </p>
    </div>
  );
}

export function AppDashboard() {
  const [active, setActive] = useState("Visão geral");
  const nav = [
    { icon: LayoutDashboard, label: "Visão geral" },
    { icon: CalendarDays, label: "Agenda" },
    { icon: Users, label: "Clientes" },
    { icon: Wallet, label: "Financeiro" },
    { icon: FileBarChart2, label: "Relatórios" },
    { icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 hidden w-64 border-r border-slate-800 bg-slate-950 px-4 py-6 text-slate-400 lg:block">
        <Brand light />
        <p className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          Menu principal
        </p>
        <nav className="mt-3 grid gap-1">
          {nav.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                active === label
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                  : "hover:bg-white/5 hover:text-white"
              }`}
              type="button"
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-6 left-4 right-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-medium text-white">Precisa de ajuda?</p>
          <p className="mt-1 text-[11px] leading-4">Fale com nosso suporte.</p>
          <button className="mt-3 text-xs font-semibold text-[#7aa8e3]" type="button">
            Abrir chat
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-9">
          <div>
            <p className="text-xs text-slate-400">terça-feira, 23 de junho</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-[-0.035em]">{active}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-xs font-medium text-slate-500 sm:block"
            >
              Voltar ao site
            </Link>
            <button
              className="relative grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
              type="button"
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-blue-600" />
            </button>
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-rose-200 text-xs font-semibold text-rose-950">
              IM
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-5 lg:p-9">
          {active === "Financeiro" ? (
            <FinanceDashboard />
          ) : (
            <>
              <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                    Bom dia, Isabela <span>✦</span>
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Aqui está o resumo do seu negócio hoje.
                  </p>
                </div>
                <button
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20"
                  type="button"
                >
                  <Plus className="size-4" />
                  Novo agendamento
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Receita do mês" value="R$ 10.240" trend="12,5%" icon={CircleDollarSign} />
                <Stat label="Lucro líquido" value="R$ 7.168" trend="8,2%" icon={Wallet} />
                <Stat label="Clientes ativos" value="124" trend="5,4%" icon={Users} />
                <Stat label="Agendamentos" value="86" trend="18,0%" icon={CalendarDays} />
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold tracking-[-0.02em]">Receita mensal</h3>
                      <p className="mt-1 text-xs text-slate-400">R$ 10.240 em junho</p>
                    </div>
                    <button className="text-xs font-medium text-slate-500" type="button">
                      Últimos 6 meses <ChevronDown className="ml-1 inline size-3" />
                    </button>
                  </div>
                  <div className="mt-5 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData} barSize={28}>
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                        />
                        <YAxis hide />
                        <Tooltip
                          cursor={{ fill: "#f8fafc" }}
                          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                        />
                        <Bar dataKey="value" fill="#083EAA" radius={[7, 7, 0, 0]} />
                        <Bar dataKey="profit" fill="#adc9ef" radius={[7, 7, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold tracking-[-0.02em]">Agenda de hoje</h3>
                    <button className="text-xs font-semibold text-blue-600" type="button">
                      Ver agenda
                    </button>
                  </div>
                  <div className="mt-4 grid gap-1">
                    {(
                      [
                        ["09:00", "Fernanda Alves", "Consulta · Confirmado", "bg-violet-500"],
                        ["11:30", "Marcos Vinícius", "Avaliação · Pendente", "bg-amber-400"],
                        ["14:00", "Ana Clara", "Retorno · Confirmado", "bg-blue-500"],
                        ["16:30", "Paulo Mendes", "Consulta · Confirmado", "bg-emerald-500"],
                      ] as const
                    ).map(([time, name, detail, color]) => (
                      <div key={time} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-slate-50">
                        <span className="w-9 text-xs font-medium text-slate-400">{time}</span>
                        <i className={`size-2 rounded-full ${color}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-[11px] text-slate-400">{detail}</p>
                        </div>
                        <MoreHorizontal className="ml-auto size-4 text-slate-300" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Últimos pagamentos</h3>
                      <p className="mt-1 text-xs text-slate-400">Recebimentos recentes</p>
                    </div>
                    <button
                      className="grid size-8 place-items-center rounded-lg border border-slate-200"
                      type="button"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-[10px] uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="pb-3 font-medium">Cliente</th>
                          <th className="pb-3 font-medium">Serviço</th>
                          <th className="pb-3 text-right font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            ["Renata Costa", "Consulta nutricional", "R$ 180"],
                            ["Gabriel Lima", "Avaliação física", "R$ 150"],
                            ["Bruna Melo", "Retorno", "R$ 120"],
                          ] as const
                        ).map(([n, s, v]) => (
                          <tr key={n} className="border-t border-slate-100">
                            <td className="py-3 font-medium">{n}</td>
                            <td className="py-3 text-xs text-slate-500">{s}</td>
                            <td className="py-3 text-right font-semibold text-emerald-600">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold">Clientes recentes</h3>
                  <div className="mt-4 grid gap-3">
                    {["Camila Freitas", "João Pedro", "Lívia Santos"].map((name, i) => (
                      <div key={name} className="flex items-center gap-3">
                        <span
                          className={`grid size-9 place-items-center rounded-full text-xs font-semibold ${
                            [
                              "bg-pink-100 text-pink-700",
                              "bg-orange-100 text-orange-700",
                              "bg-cyan-100 text-cyan-700",
                            ][i]
                          }`}
                        >
                          {name
                            .split(" ")
                            .map((x) => x[0])
                            .join("")}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-slate-400">Novo cliente · hoje</p>
                        </div>
                        <button className="ml-auto text-xs font-semibold text-blue-600" type="button">
                          Ver
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
