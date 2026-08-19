"use server";

import { prisma } from "@/shared/lib/prisma";
import { hasPermission } from "@/shared/lib/rbac";
import { requireSession } from "@/shared/lib/session";

export type GlobalSearchResult = {
  id: string;
  type: "customer" | "transaction" | "category";
  title: string;
  subtitle: string;
  href: string;
};

export async function globalSearchAction(query: string): Promise<GlobalSearchResult[]> {
  const user = await requireSession();
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const canViewCustomers = hasPermission(user.role, "customers:view");
  const canViewFinance = hasPermission(user.role, "finance:view");

  const [customers, transactions, categories] = await Promise.all([
    canViewCustomers
      ? prisma.customer.findMany({
          where: {
            companyId: user.companyId,
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { document: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    canViewFinance
      ? prisma.transaction.findMany({
          where: {
            companyId: user.companyId,
            deletedAt: null,
            OR: [
              { description: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
    canViewFinance
      ? prisma.category.findMany({
          where: {
            companyId: user.companyId,
            deletedAt: null,
            name: { contains: q, mode: "insensitive" },
          },
          take: 5,
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return [
    ...customers.map((customer) => ({
      id: customer.id,
      type: "customer" as const,
      title: customer.name,
      subtitle: customer.email ?? customer.phone ?? "Cliente",
      href: `/app/customers?q=${encodeURIComponent(customer.name)}`,
    })),
    ...transactions.map((transaction) => ({
      id: transaction.id,
      type: "transaction" as const,
      title: transaction.description ?? "Movimentação",
      subtitle: `${transaction.type} · R$ ${Number(transaction.amount).toFixed(2)}`,
      href: `/app/finance?q=${encodeURIComponent(transaction.description ?? "")}`,
    })),
    ...categories.map((category) => ({
      id: category.id,
      type: "category" as const,
      title: category.name,
      subtitle: category.type === "INCOME" ? "Categoria de receita" : "Categoria de despesa",
      href: `/app/finance?category=${category.id}`,
    })),
  ];
}
