import type { Plan } from "@prisma/client";

export type PaidPlan = Extract<Plan, "PROFESSIONAL" | "BUSINESS">;

export type PlanDefinition = {
  id: Plan;
  name: string;
  priceMonthly: number;
  description: string;
  features: string[];
  maxCustomers: number | null;
  maxUsers: number | null;
  /** Soft cap on finance transactions (null = unlimited). */
  maxTransactions: number | null;
  highlighted?: boolean;
};

export const PLAN_DEFINITIONS: Record<Plan, PlanDefinition> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceMonthly: 0,
    description: "Para organizar o básico",
    features: [
      "Até 200 lançamentos",
      "Clientes ilimitados",
      "Dashboard com KPIs",
      "Relatório mensal",
    ],
    maxCustomers: null,
    maxUsers: 1,
    maxTransactions: 200,
  },
  PROFESSIONAL: {
    id: "PROFESSIONAL",
    name: "Profissional",
    priceMonthly: 49,
    description: "Para quem quer acompanhar de verdade",
    features: [
      "Lançamentos ilimitados",
      "Clientes ilimitados",
      "Financeiro completo",
      "Histórico por cliente",
      "Relatório mensal",
    ],
    maxCustomers: null,
    maxUsers: 1,
    maxTransactions: null,
    highlighted: true,
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    priceMonthly: 99,
    description: "Para equipes e mais usuários",
    features: [
      "Tudo do Profissional",
      "Múltiplos usuários",
      "Suporte prioritário",
      "Relatório mensal",
    ],
    maxCustomers: null,
    maxUsers: null,
    maxTransactions: null,
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    priceMonthly: 0,
    description: "Sob consulta",
    features: ["Customizado"],
    maxCustomers: null,
    maxUsers: null,
    maxTransactions: null,
  },
};

export const PAID_PLANS: PaidPlan[] = ["PROFESSIONAL", "BUSINESS"];

export function isPaidPlan(plan: string): plan is PaidPlan {
  return plan === "PROFESSIONAL" || plan === "BUSINESS";
}

export function formatPlanPrice(value: number): string {
  if (value <= 0) return "R$ 0";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildBillingExternalReference(companyId: string, plan: PaidPlan): string {
  return `bos:${companyId}:${plan}`;
}

export function parseBillingExternalReference(
  value: string | null | undefined,
): { companyId: string; plan: PaidPlan } | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length < 3 || parts[0] !== "bos") return null;
  const companyId = parts[1];
  const plan = parts[2];
  if (!companyId || !isPaidPlan(plan)) return null;
  return { companyId, plan };
}
