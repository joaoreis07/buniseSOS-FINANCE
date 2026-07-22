import type { Category as PrismaCategory, Transaction as PrismaTransaction } from "@prisma/client";
import type { CategoryResponseDTO, TransactionResponseDTO } from "./finance.dto";

export function toCategoryResponseDTO(category: PrismaCategory): CategoryResponseDTO {
  return {
    id: category.id,
    companyId: category.companyId,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    parentId: category.parentId,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

type TransactionWithRelations = PrismaTransaction & {
  category?: { name: string } | null;
  customer?: { name: string } | null;
};

export function toTransactionResponseDTO(
  transaction: TransactionWithRelations,
): TransactionResponseDTO {
  return {
    id: transaction.id,
    companyId: transaction.companyId,
    type: transaction.type,
    status: transaction.status,
    paymentMethod: transaction.paymentMethod,
    amount: Number(transaction.amount),
    description: transaction.description,
    notes: transaction.notes,
    date: transaction.date,
    dueDate: transaction.dueDate,
    paidAt: transaction.paidAt,
    categoryId: transaction.categoryId,
    customerId: transaction.customerId,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    categoryName: transaction.category?.name ?? null,
    customerName: transaction.customer?.name ?? null,
  };
}
