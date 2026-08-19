export class SaleTotalsError extends Error {
  readonly path: string;

  constructor(message: string, path: string) {
    super(message);
    this.name = "SaleTotalsError";
    this.path = path;
  }
}

export type SaleItemInput = {
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  discountAmount?: number | string;
  sortOrder?: number;
};

export type ComputedSaleItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  sortOrder: number;
};

export type ComputedSaleTotals = {
  items: ComputedSaleItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
};

export type ResolvedSaleFinancials = {
  totalAmount: number;
  discountAmount: number;
  items: ComputedSaleItem[] | null;
};

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function toMilliQty(value: number): number {
  return Math.round(value * 1000);
}

function fromMilliQty(milli: number): number {
  return milli / 1000;
}

export function parseNumericInput(value: string | number, field: string): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new SaleTotalsError(`${field} inválido`, field);
    }
    return value;
  }

  const normalized = value.trim().replace(/[^\d.,-]/g, "");
  if (!normalized) {
    throw new SaleTotalsError(`${field} inválido`, field);
  }
  const amount = Number(
    normalized.includes(",")
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized,
  );
  if (!Number.isFinite(amount)) {
    throw new SaleTotalsError(`${field} inválido`, field);
  }
  return amount;
}

function lineSubtotalCents(quantityMilli: number, unitPriceCents: number): number {
  return Math.round((quantityMilli * unitPriceCents) / 1000);
}

export function computeSaleFromItems(
  items: SaleItemInput[],
  generalDiscountAmount: number | string = 0,
): ComputedSaleTotals {
  if (items.length === 0) {
    throw new SaleTotalsError("Informe ao menos um item", "items");
  }

  const computedItems: ComputedSaleItem[] = items.map((item, index) => {
    const description = item.description.trim();
    if (!description) {
      throw new SaleTotalsError("Informe a descrição do item", `items.${index}.description`);
    }

    const quantityRaw = parseNumericInput(item.quantity, "Quantidade");
    const quantityMilli = toMilliQty(quantityRaw);
    if (quantityMilli <= 0) {
      throw new SaleTotalsError("Quantidade deve ser maior que zero", `items.${index}.quantity`);
    }

    const unitPriceRaw = parseNumericInput(item.unitPrice, "Valor unitário");
    if (unitPriceRaw < 0) {
      throw new SaleTotalsError("Valor unitário inválido", `items.${index}.unitPrice`);
    }
    const unitPriceCents = toCents(unitPriceRaw);
    const subtotalCents = lineSubtotalCents(quantityMilli, unitPriceCents);

    const discountRaw =
      item.discountAmount === undefined || item.discountAmount === ""
        ? 0
        : parseNumericInput(item.discountAmount, "Desconto do item");
    if (discountRaw < 0) {
      throw new SaleTotalsError("Desconto do item inválido", `items.${index}.discountAmount`);
    }
    const discountCents = toCents(discountRaw);
    if (discountCents > subtotalCents) {
      throw new SaleTotalsError(
        "Desconto do item maior que o subtotal",
        `items.${index}.discountAmount`,
      );
    }

    const lineTotalCents = subtotalCents - discountCents;
    if (lineTotalCents < 0) {
      throw new SaleTotalsError("Total do item inválido", `items.${index}`);
    }

    return {
      description,
      quantity: fromMilliQty(quantityMilli),
      unitPrice: fromCents(unitPriceCents),
      discountAmount: fromCents(discountCents),
      lineTotal: fromCents(lineTotalCents),
      sortOrder: Number.isInteger(item.sortOrder) ? (item.sortOrder as number) : index,
    };
  });

  const subtotalCents = computedItems.reduce((acc, item) => acc + toCents(item.lineTotal), 0);
  const generalRaw =
    generalDiscountAmount === undefined || generalDiscountAmount === ""
      ? 0
      : parseNumericInput(generalDiscountAmount as number | string, "Desconto geral");
  if (generalRaw < 0) {
    throw new SaleTotalsError("Desconto geral inválido", "discountAmount");
  }
  const generalCents = toCents(generalRaw);
  if (generalCents > subtotalCents) {
    throw new SaleTotalsError("Desconto geral maior que o subtotal", "discountAmount");
  }

  const totalCents = subtotalCents - generalCents;
  if (totalCents < 0) {
    throw new SaleTotalsError("Total inválido", "totalAmount");
  }

  return {
    items: computedItems,
    subtotal: fromCents(subtotalCents),
    discountAmount: fromCents(generalCents),
    totalAmount: fromCents(totalCents),
  };
}

export function resolveCreateSaleFinancials(data: {
  totalAmount: number;
  discountAmount?: number | string;
  items?: SaleItemInput[] | null;
}): ResolvedSaleFinancials {
  if (data.items === undefined || data.items === null) {
    return {
      totalAmount: data.totalAmount,
      discountAmount: 0,
      items: null,
    };
  }

  if (data.items.length === 0) {
    throw new SaleTotalsError("Informe ao menos um item", "items");
  }

  const computed = computeSaleFromItems(data.items, data.discountAmount ?? 0);
  return {
    totalAmount: computed.totalAmount,
    discountAmount: computed.discountAmount,
    items: computed.items,
  };
}

/** Integer-cent split used by createSale installments. */
export function splitAmount(total: number, count: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const parts = Array.from({ length: count }, () => base);
  let remainder = cents - base * count;
  for (let i = 0; i < parts.length && remainder > 0; i += 1) {
    parts[i] += 1;
    remainder -= 1;
  }
  return parts.map((value) => value / 100);
}
