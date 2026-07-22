import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";
import type {
  CategoryResponseDTO,
  CreateCategoryDTO,
  CreateTransactionDTO,
  TransactionListParams,
  TransactionResponseDTO,
  UpdateCategoryDTO,
  UpdateTransactionDTO,
} from "../dto/finance.dto";
import { toCategoryResponseDTO, toTransactionResponseDTO } from "../dto/mappers";
import type { ICategoryRepository, ITransactionRepository } from "./finance.repository";

export class PrismaCategoryRepository implements ICategoryRepository {
  async create(companyId: string, data: CreateCategoryDTO): Promise<CategoryResponseDTO> {
    assertTenantId(companyId);
    const category = await prisma.category.create({
      data: {
        companyId,
        name: data.name,
        type: data.type,
        icon: data.icon ?? null,
        color: data.color ?? null,
        parentId: data.parentId ?? null,
      },
    });
    return toCategoryResponseDTO(category);
  }

  async update(
    companyId: string,
    id: string,
    data: UpdateCategoryDTO,
  ): Promise<CategoryResponseDTO> {
    assertTenantId(companyId);
    const existing = await prisma.category.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) {
      throw new Error("Category not found");
    }
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        parentId: data.parentId,
      },
    });
    return toCategoryResponseDTO(category);
  }

  async softDelete(companyId: string, id: string): Promise<void> {
    assertTenantId(companyId);
    const existing = await prisma.category.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) {
      throw new Error("Category not found");
    }
    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findById(companyId: string, id: string): Promise<CategoryResponseDTO | null> {
    assertTenantId(companyId);
    const category = await prisma.category.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    return category ? toCategoryResponseDTO(category) : null;
  }

  async list(companyId: string, type?: "INCOME" | "EXPENSE"): Promise<CategoryResponseDTO[]> {
    assertTenantId(companyId);
    const categories = await prisma.category.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(type ? { type } : {}),
      },
      orderBy: { name: "asc" },
    });
    return categories.map(toCategoryResponseDTO);
  }
}

export class PrismaTransactionRepository implements ITransactionRepository {
  async create(
    companyId: string,
    data: CreateTransactionDTO,
  ): Promise<TransactionResponseDTO> {
    assertTenantId(companyId);
    const transaction = await prisma.transaction.create({
      data: {
        companyId,
        type: data.type,
        status: data.status ?? "PENDING",
        paymentMethod: data.paymentMethod ?? null,
        amount: data.amount,
        description: data.description ?? null,
        notes: data.notes ?? null,
        date: data.date,
        dueDate: data.dueDate ?? null,
        paidAt: data.paidAt ?? null,
        categoryId: data.categoryId ?? null,
        customerId: data.customerId ?? null,
      },
    });
    return toTransactionResponseDTO(transaction);
  }

  async update(
    companyId: string,
    id: string,
    data: UpdateTransactionDTO,
  ): Promise<TransactionResponseDTO> {
    assertTenantId(companyId);
    const existing = await prisma.transaction.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) {
      throw new Error("Transaction not found");
    }
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        type: data.type,
        status: data.status,
        paymentMethod: data.paymentMethod,
        amount: data.amount,
        description: data.description,
        notes: data.notes,
        date: data.date,
        dueDate: data.dueDate,
        paidAt: data.paidAt,
        categoryId: data.categoryId,
        customerId: data.customerId,
      },
    });
    return toTransactionResponseDTO(transaction);
  }

  async softDelete(companyId: string, id: string): Promise<void> {
    assertTenantId(companyId);
    const existing = await prisma.transaction.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) {
      throw new Error("Transaction not found");
    }
    await prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findById(companyId: string, id: string): Promise<TransactionResponseDTO | null> {
    assertTenantId(companyId);
    const transaction = await prisma.transaction.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        category: { select: { name: true } },
        customer: { select: { name: true } },
      },
    });
    return transaction ? toTransactionResponseDTO(transaction) : null;
  }

  async list(
    companyId: string,
    params: TransactionListParams = {},
  ): Promise<{ items: TransactionResponseDTO[]; total: number }> {
    assertTenantId(companyId);
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const where: Prisma.TransactionWhereInput = {
      companyId,
      deletedAt: null,
      ...(params.type ? { type: params.type } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            date: {
              ...(params.dateFrom ? { gte: params.dateFrom } : {}),
              ...(params.dateTo ? { lte: params.dateTo } : {}),
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              { description: { contains: params.search, mode: "insensitive" } },
              { notes: { contains: params.search, mode: "insensitive" } },
              { customer: { name: { contains: params.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: { select: { name: true } },
          customer: { select: { name: true } },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      items: items.map(toTransactionResponseDTO),
      total,
    };
  }
}
