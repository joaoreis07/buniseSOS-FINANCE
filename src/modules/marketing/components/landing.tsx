"use client";

import { useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileBarChart2,
  LayoutDashboard,
  Menu,
  NotebookPen,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Brand, Pill } from "@/shared/components/brand";
import { demoLoginAction } from "@/modules/auth/actions/auth.actions";
import { SignupCtaBalloon } from "./signup-cta-balloon";

const revenueData = [
  { month: "Jan", value: 5200, profit: 3500 },
  { month: "Fev", value: 6800, profit: 4400 },
  { month: "Mar", value: 6100, profit: 4100 },
  { month: "Abr", value: 8600, profit: 5900 },
  { month: "Mai", value: 7800, profit: 5200 },
  { month: "Jun", value: 10240, profit: 7168 },
];

const features = [
  {
    icon: Wallet,
    title: "Controle financeiro",
    description: "Registre entradas e saídas e saiba exatamente quanto entra e quanto sai.",
  },
  {
    icon: CircleDollarSign,
    title: "Saldo e fluxo de caixa",
    description: "Acompanhe o saldo atual, o pendente e o vencido sem abrir planilha.",
  },
  {
    icon: Users,
    title: "Clientes e histórico",
    description: "Cadastre clientes e veja o histórico financeiro de cada um em um clique.",
  },
  {
    icon: NotebookPen,
    title: "Tudo fora do papel",
    description: "Troque cadernos e anotações soltas por um registro organizado e pesquisável.",
  },
  {
    icon: LayoutDashboard,
    title: "Visão clara do mês",
    description: "KPIs, meta mensal e gráficos para entender o momento do seu caixa.",
  },
  {
    icon: FileBarChart2,
    title: "Relatórios simples",
    description: "Indicadores objetivos para decidir com base em números, não em memória.",
  },
];

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[650px] pb-28 sm:pb-24">
      <div className="rounded-[22px] border border-slate-200/90 bg-white p-3 shadow-[0_30px_75px_-28px_rgba(15,23,42,0.35)]">
        <div className="flex h-[365px] overflow-hidden rounded-[14px] border border-slate-100 bg-slate-50">
          <aside className="hidden w-[116px] shrink-0 bg-slate-950 p-3 text-slate-400 sm:block">
            <div className="mb-8 flex items-center gap-1.5 text-[9px] font-semibold text-white">
              <Image
                src="/brand/logo.png"
                alt=""
                width={20}
                height={20}
                className="size-5 shrink-0 rounded-md"
              />
              BusinessOS
            </div>
            {["Visão geral", "Financeiro", "Agenda", "Clientes"].map((x, i) => (
              <div
                key={x}
                className={`mb-1 rounded-md px-2 py-1.5 text-[8px] ${i === 0 ? "bg-white/10 text-white" : ""}`}
              >
                {x}
              </div>
            ))}
          </aside>
          <div className="min-w-0 flex-1 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-400">Olá, Isabela</p>
                <p className="text-sm font-semibold tracking-[-0.03em] text-slate-900">Visão geral</p>
              </div>
              <div className="size-6 rounded-full bg-amber-100" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Receita", "R$ 10.240"],
                ["Lucro", "R$ 7.168"],
                ["Saldo", "R$ 18.250"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-100 bg-white p-2.5">
                  <p className="text-[7px] text-slate-400">{label}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-900">{value}</p>
                  <p className="mt-1 text-[7px] font-medium text-emerald-600">↑ 12,5%</p>
                </div>
              ))}
            </div>
            <div className="mt-3 h-[125px] rounded-lg border border-slate-100 bg-white p-3">
              <p className="text-[8px] font-medium text-slate-600">Como anda a receita</p>
              <p className="text-[7px] text-slate-400">Linha sobe = entrou mais</p>
              <ResponsiveContainer width="100%" height="78%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="previewFill" x1="0" x2="0" y1="0" y2="1">
                      <stop stopColor="#083EAA" stopOpacity=".2" />
                      <stop offset="1" stopColor="#083EAA" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#083EAA"
                    strokeWidth={2}
                    fill="url(#previewFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                <p className="text-[8px] font-medium text-slate-600">Últimas movimentações</p>
                <div className="mt-2 flex items-center gap-2 text-[8px]">
                  <span className="size-5 rounded-full bg-emerald-100" />
                  Consulta · Renata{" "}
                  <span className="ml-auto font-semibold text-emerald-600">+R$ 180</span>
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                <p className="text-[8px] font-medium text-slate-600">Meta do mês</p>
                <p className="mt-2 text-[13px] font-semibold">68%</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[68%] rounded-full bg-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-3 top-10 z-10 hidden rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-xl lg:block">
          <p className="text-[9px] text-slate-400">Nova entrada</p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-900">PIX · R$ 250,00</p>
        </div>
      </div>

      {/* Balloon overlapping the mockup — matches the product screenshot */}
      <div className="absolute bottom-2 left-1/2 z-20 w-[min(100%,300px)] -translate-x-1/2 sm:bottom-4 sm:left-auto sm:right-2 sm:translate-x-0 sm:w-[280px]">
        <SignupCtaBalloon variant="inline" />
      </div>
    </div>
  );
}

function OpenAppLink({
  children,
  className,
  href = "/criar-conta",
}: {
  children: ReactNode;
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function Landing({ demoEnabled = false }: { demoEnabled?: boolean }) {
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState<number | null>(null);
  const [demoPending, startDemo] = useTransition();
  const faqs = [
    {
      q: "Preciso informar cartão para testar?",
      a: "Não. Você pode explorar a plataforma gratuitamente e decidir com calma se faz sentido para o seu controle financeiro.",
    },
    {
      q: "Serve para quem ainda anota no papel?",
      a: "Sim. O foco é tirar o financeiro do caderno e da memória: lançamentos, clientes, saldo e histórico em um só lugar.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. Não há fidelidade neste MVP: você usa enquanto fizer sentido para a sua rotina.",
    },
  ];

  const openDemo = () => {
    startDemo(async () => {
      const result = await demoLoginAction();
      // Successful sign-in redirects server-side; only handle failures here.
      if (result && !result.success) {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="bg-[#f8fafc] text-slate-900">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
          <a href="#recursos">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#planos">Planos</a>
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <OpenAppLink href="/login" className="text-sm font-medium text-slate-600">
            Entrar
          </OpenAppLink>
          <OpenAppLink
            href="/criar-conta"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5"
          >
            Começar grátis
          </OpenAppLink>
        </div>
        <button className="md:hidden" onClick={() => setMenu(!menu)} type="button">
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      {menu && (
        <div className="mx-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:hidden">
          <div className="grid gap-3 text-sm text-slate-600">
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
            <OpenAppLink
              href="/criar-conta"
              className="rounded-xl bg-blue-600 py-2 text-center text-white"
            >
              Começar grátis
            </OpenAppLink>
          </div>
        </div>
      )}

      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-14 overflow-visible px-5 pb-28 pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-40 lg:pt-28">
          <div className="relative z-10">
            <Pill>Controle financeiro no dia a dia</Pill>
            <h1 className="mt-6 max-w-xl text-[48px] font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[64px]">
              Tire o financeiro do papel e acompanhe tudo em um só lugar.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-500">
              Receitas, despesas, clientes e saldo — com clareza para saber o que entra, o que sai
              e o que ainda está pendente. Sem planilha confusa. Sem depender da memória.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <OpenAppLink
                href="/criar-conta"
                className="group flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5"
              >
                Começar gratuitamente{" "}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </OpenAppLink>
              {demoEnabled && (
                <button
                  type="button"
                  onClick={openDemo}
                  disabled={demoPending}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
                >
                  {demoPending ? "Abrindo demonstração..." : "Ver demonstração"}
                </button>
              )}
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <Check className="size-4 text-emerald-500" />
              Grátis para começar · sem pagar nada agora
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-10 -z-10 rounded-full bg-blue-200/35 blur-3xl" />
            <DashboardPreview />
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-5 py-7 lg:px-8">
            <p className="max-w-xs text-sm text-slate-500">
              Feito para quem quer organizar o caixa, não para vender agendamento online.
            </p>
            <div className="flex flex-wrap items-center gap-x-9 gap-y-3 text-sm font-semibold tracking-[-0.02em] text-slate-400">
              <span>entradas e saídas</span>
              <span>saldo em dia</span>
              <span>histórico de clientes</span>
            </div>
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="max-w-2xl">
            <Pill>O essencial do seu caixa</Pill>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Controle financeiro completo, sem firula.
            </h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
                whileHover={{ y: -4 }}
                className="group bg-white p-7 transition-colors hover:bg-blue-50/45"
              >
                <motion.div
                  whileHover={{ scale: 1.06 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white"
                >
                  <Icon className="size-5" />
                </motion.div>
                <h3 className="mt-7 text-lg font-semibold tracking-[-0.025em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="bg-slate-950 py-24 text-white">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <Pill>Comece hoje</Pill>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Do papel para o digital, em três passos.
              </h2>
              <p className="mt-5 max-w-sm leading-7 text-slate-400">
                Em poucos minutos você já consegue registrar o dia e enxergar o mês com clareza.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                [
                  "01",
                  "Crie sua conta",
                  "Cadastre sua empresa e entre no painel com segurança.",
                ],
                [
                  "02",
                  "Cadastre clientes e categorias",
                  "Organize quem paga, o que entra e o que sai.",
                ],
                [
                  "03",
                  "Lance as movimentações",
                  "Registre receitas e despesas e acompanhe saldo, meta e histórico.",
                ],
              ].map(([num, title, desc]) => (
                <div
                  key={num}
                  className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:bg-white/[0.08]"
                >
                  <span className="font-mono text-sm text-blue-400">{num}</span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="text-center">
            <Pill>Planos transparentes</Pill>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Comece simples. Evolua quando precisar.
            </h2>
            <p className="mt-4 text-slate-500">Foque no controle do caixa. Sem promessas de agenda.</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
            {(
              [
                [
                  "Starter",
                  "R$ 0",
                  "Para organizar o básico",
                  ["Até 200 lançamentos", "Clientes ilimitados", "Dashboard com KPIs"],
                ],
                [
                  "Profissional",
                  "R$ 49",
                  "Para quem quer acompanhar de verdade",
                  ["Lançamentos ilimitados", "Clientes ilimitados", "Histórico por cliente"],
                ],
                [
                  "Business",
                  "R$ 99",
                  "Para equipes e mais usuários",
                  ["Tudo do Profissional", "Múltiplos usuários", "Suporte prioritário"],
                ],
              ] as const
            ).map(([name, price, desc, points], i) => (
              <div
                key={name}
                className={`relative rounded-2xl border p-7 ${
                  i === 1
                    ? "border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-600/20"
                    : "border-slate-200 bg-white"
                }`}
              >
                {i === 1 && (
                  <span className="absolute -top-3 rounded-full bg-amber-300 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-950">
                    Mais escolhido
                  </span>
                )}
                <h3 className="font-semibold">{name}</h3>
                <p className={`mt-2 text-sm ${i === 1 ? "text-blue-100" : "text-slate-500"}`}>
                  {desc}
                </p>
                <p className="mt-6 text-4xl font-semibold tracking-[-0.05em]">
                  {price}
                  <span className="text-sm font-normal">/mês</span>
                </p>
                <OpenAppLink
                  href="/criar-conta"
                  className={`mt-7 block w-full rounded-xl py-3 text-center text-sm font-semibold transition hover:-translate-y-0.5 ${
                    i === 1 ? "bg-white text-blue-700" : "bg-slate-950 text-white"
                  }`}
                >
                  Começar agora
                </OpenAppLink>
                <ul className="mt-7 grid gap-3">
                  {points.map((point) => (
                    <li
                      key={point}
                      className={`flex items-center gap-2 text-sm ${
                        i === 1 ? "text-blue-50" : "text-slate-600"
                      }`}
                    >
                      <Check className="size-4 text-emerald-400" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto grid max-w-5xl gap-12 px-5 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
            <div>
              <Pill>Sem complicação</Pill>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em]">Dúvidas frequentes</h2>
            </div>
            <div>
              {faqs.map((item, i) => (
                <div key={item.q} className="border-b border-slate-200 py-5">
                  <button
                    onClick={() => setFaq(faq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-6 text-left font-semibold"
                    type="button"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`size-5 transition ${faq === i ? "rotate-180" : ""}`} />
                  </button>
                  {faq === i && (
                    <p className="max-w-xl pt-3 text-sm leading-6 text-slate-500">{item.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-blue-600 px-7 py-16 text-center text-white sm:px-12">
            <p className="text-sm font-medium text-blue-100">Pronto para organizar o caixa?</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Crie sua conta grátis e tire o financeiro do papel hoje.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-blue-100">
              Cadastre o primeiro cliente, lance a primeira entrada e veja o saldo na hora.
            </p>
            <OpenAppLink
              href="/criar-conta"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-700 shadow-lg transition hover:-translate-y-0.5"
            >
              Criar minha conta grátis
              <ArrowRight className="size-4" />
            </OpenAppLink>
            <p className="mt-4 text-xs text-blue-100/90">
              Grátis para começar · sem pagar nada agora
            </p>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 px-5 py-9 text-sm text-slate-500 md:flex-row md:items-end lg:px-8">
          <div>
            <Brand />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
              Dúvidas ou suporte? Fale comigo pelo Instagram ou WhatsApp.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="https://www.instagram.com/reisjoaosv"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-slate-900"
            >
              Instagram · @reisjoaosv
            </a>
            <a
              href="https://wa.me/5543988485531"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-slate-900"
            >
              WhatsApp · (43) 98848-5531
            </a>
            <a href="tel:+5543988485531" className="transition hover:text-slate-900">
              Telefone · (43) 98848-5531
            </a>
          </div>
          <p>© 2026 BusinessOS Finance</p>
        </div>
      </footer>
    </div>
  );
}
