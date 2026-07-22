import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { assertTenantId } from "@/shared/lib/tenant";
import type {
  CreateCustomerDTO,
  CustomerDetailDTO,
  CustomerListParams,
  CustomerResponseDTO,
  UpdateCustomerDTO,
} from "../dto/customer.dto";
import { toCustomerResponseDTO } from "../dto/mappers";
import type { ICustomerRepository } from "./customer.repository";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export class PrismaCustomerRepository implements ICustomerRepository {
  async create(companyId: string, data: CreateCustomerDTO): Promise<CustomerResponseDTO> {
    assertTenantId(companyId);
    const customer = await prisma.customer.create({
      data: {
        companyId,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        document: data.document ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        notes: data.notes ?? null,
        status: data.status ?? "ACTIVE",
      },
    });
    return toCustomerResponseDTO(customer);
  }

  async update(
    companyId: string,
    id: string,
    data: UpdateCustomerDTO,
  ): Promise<CustomerResponseDTO> {
    assertTenantId(companyId);
    const existing = await prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) {
      throw new Error("Customer not found");
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        document: data.document,
        address: data.address,
        city: data.city,
        state: data.state,
        notes: data.notes,
        status: data.status,
      },
    });
    return toCustomerResponseDTO(customer);
  }

  async softDelete(companyId: string, id: string): Promise<void> {
    assertTenantId(companyId);
    const existing = await prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) {
      throw new Error("Customer not found");
    }
    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findById(companyId: string, id: string): Promise<CustomerResponseDTO | null> {
    assertTenantId(companyId);
    const customer = await prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    return customer ? toCustomerResponseDTO(customer) : null;
  }

  async list(
    companyId: string,
    params: CustomerListParams = {},
  ): Promise<{ items: CustomerResponseDTO[]; total: number }> {
    assertTenantId(companyId);
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const where: Prisma.CustomerWhereInput = {
      companyId,
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { email: { contains: params.search, mode: "insensitive" } },
              { document: { contains: params.search, mode: "insensitive" } },
              { phone: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      items: items.map(toCustomerResponseDTO),
      total,
    };
  }

  async getDetail(companyId: string, id: string): Promise<CustomerDetailDTO | null> {
    assertTenantId(companyId);
    const customer = await prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!customer) {
      return null;
    }

    const transactions = await prisma.transaction.findMany({
      where: { companyId, customerId: id, deletedAt: null },
      orderBy: { date: "desc" },
      take: 50,
    });

    let incomePaid = 0;
    let expensePaid = 0;
    let pendingIncome = 0;

    for (const item of transactions) {
      const amount = Number(item.amount);
      if (item.type === "INCOME" && item.status === "PAID") {
        incomePaid += amount;
      }
      if (item.type === "EXPENSE" && item.status === "PAID") {
        expensePaid += amount;
      }
      if (item.type === "INCOME" && (item.status === "PENDING" || item.status === "OVERDUE")) {
        pendingIncome += amount;
      }
    }

    return {
      customer: toCustomerResponseDTO(customer),
      history: transactions.map((item) => ({
        id: item.id,
        type: item.type,
        status: item.status,
        paymentMethod: item.paymentMethod,
        amount: Number(item.amount),
        formattedAmount: formatCurrency(Number(item.amount)),
        description: item.description,
        date: item.date.toISOString(),
        dueDate: item.dueDate ? item.dueDate.toISOString() : null,
      })),
      summary: {
        incomePaid,
        expensePaid,
        balance: incomePaid - expensePaid,
        pendingIncome,
        transactionCount: transactions.length,
      },
    };
  }
}
