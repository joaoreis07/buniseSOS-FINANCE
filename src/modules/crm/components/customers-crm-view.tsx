"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Pencil, Plus, Search, ShoppingCart, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { EmptyState } from "@/shared/components/empty-state";
import type { CustomerClientDTO } from "@/modules/customers/dto/customer.dto";
import { getCustomerDetailAction } from "@/modules/customers/actions/customer.actions";
import { CustomerFormDialog } from "@/modules/customers/components/customer-form-dialog";
import type { CustomerListCrmItemDTO, FinancialCustomerStatus } from "../dto/crm.dto";
import { FinancialStatusBadge } from "./financial-status-badge";
import { SaleFormDialog } from "./sale-form-dialog";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export function CustomersCrmView({
  initialItems,
  categories,
  canManageCustomers,
  canManageFinance,
}: {
  initialItems: CustomerListCrmItemDTO[];
  categories: Array<{ id: string; name: string }>;
  canManageCustomers: boolean;
  canManageFinance: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"ALL" | FinancialCustomerStatus>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [saleCustomerId, setSaleCustomerId] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<CustomerClientDTO | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const phoneQuery = phone.trim().toLowerCase();
    return items.filter((item) => {
      if (status !== "ALL" && item.financialStatus !== status) return false;
      if (phoneQuery) {
        const phones = [item.phone, item.whatsapp].filter(Boolean).join(" ").toLowerCase();
        if (!phones.includes(phoneQuery)) return false;
      }
      if (!query) return true;
      return [item.name, item.email, item.phone, item.document]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query));
    });
  }, [items, search, phone, status]);

  const openEditCustomer = (id: string) => {
    startTransition(async () => {
      const result = await getCustomerDetailAction({ id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setEditing(result.data.customer);
      setFormOpen(true);
    });
  };

  const columns = useMemo<ColumnDef<CustomerListCrmItemDTO>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nome",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900">{row.original.name}</p>
            <p className="text-xs text-slate-400">{row.original.document ?? "—"}</p>
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Telefone",
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {row.original.phone ?? row.original.whatsapp ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "formattedTotalPurchased",
        header: "Total comprado",
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.formattedTotalPurchased}</span>
        ),
      },
      {
        accessorKey: "formattedTotalPaid",
        header: "Total pago",
        cell: ({ row }) => (
          <span className="text-sm text-emerald-700">{row.original.formattedTotalPaid}</span>
        ),
      },
      {
        accessorKey: "formattedBalanceDue",
        header: "Saldo devedor",
        cell: ({ row }) => (
          <span
            className={`text-sm font-medium ${
              row.original.balanceDue > 0 ? "text-rose-600" : "text-slate-500"
            }`}
          >
            {row.original.formattedBalanceDue}
          </span>
        ),
      },
      {
        accessorKey: "lastPurchaseAt",
        header: "Última compra",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500">{formatDate(row.original.lastPurchaseAt)}</span>
        ),
      },
      {
        accessorKey: "financialStatus",
        header: "Status",
        cell: ({ row }) => <FinancialStatusBadge status={row.original.financialStatus} />,
      },
      {
        id: "actions",
        header: "Ações",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
            {canManageFinance && (
              <Button
                type="button"
                size="sm"
                className="rounded-lg bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setSaleCustomerId(row.original.id);
                  setSaleOpen(true);
                }}
              >
                <ShoppingCart className="mr-1.5 size-3.5" />
                Vender
              </Button>
            )}
            {canManageCustomers && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => openEditCustomer(row.original.id)}
                disabled={pending}
              >
                <Pencil className="mr-1.5 size-3.5" />
                Editar
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => router.push(`/app/customers/${row.original.id}`)}
            >
              Abrir
            </Button>
          </div>
        ),
      },
    ],
    [canManageCustomers, canManageFinance, pending, router],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleSaved = (customer: CustomerClientDTO) => {
    setItems((current) => {
      const exists = current.some((item) => item.id === customer.id);
      if (exists) {
        return current.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                name: customer.name,
                phone: customer.phone,
                whatsapp: customer.whatsapp,
                email: customer.email,
                document: customer.document,
              }
            : item,
        );
      }
      return [
        {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          email: customer.email,
          document: customer.document,
          totalPurchased: 0,
          totalPaid: 0,
          balanceDue: 0,
          lastPurchaseAt: null,
          financialStatus: "UP_TO_DATE",
          formattedTotalPurchased: "R$ 0,00",
          formattedTotalPaid: "R$ 0,00",
          formattedBalanceDue: "R$ 0,00",
        },
        ...current,
      ];
    });
    refresh();
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Clientes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre clientes, registre vendas e acompanhe parcelas
            {pending ? " · atualizando..." : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageCustomers && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="rounded-xl"
            >
              <Plus className="mr-2 size-4" />
              Novo cliente
            </Button>
          )}
          {canManageFinance && items.length > 0 && (
            <Button
              type="button"
              onClick={() => {
                setSaleCustomerId(undefined);
                setSaleOpen(true);
              }}
              className="rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <ShoppingCart className="mr-2 size-4" />
              Nova venda
            </Button>
          )}
        </div>
      </div>

      {canManageFinance && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
          <strong className="font-semibold">Como registrar parcelas:</strong> use{" "}
          <span className="font-semibold">Nova venda</span> → escolha{" "}
          <span className="font-semibold">Parcelado</span>. Depois acompanhe na
          ficha do cliente, na aba Parcelas.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar por nome..."
            className="h-11 rounded-xl pl-10"
          />
        </div>
        <Input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Telefone"
          className="h-11 w-[160px] rounded-xl"
        />
        <Select
          value={status}
          onValueChange={(value: "ALL" | FinancialCustomerStatus) => setStatus(value)}
        >
          <SelectTrigger className="h-11 w-[220px] rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="UP_TO_DATE">Em dia</SelectItem>
            <SelectItem value="HAS_PENDING">Parcelas pendentes</SelectItem>
            <SelectItem value="OVERDUE">Inadimplente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum resultado"}
          description={
            items.length === 0
              ? "Comece cadastrando o primeiro cliente da sua base."
              : "Ajuste os filtros de nome, telefone ou status."
          }
          icon={Users}
          actionLabel={canManageCustomers && items.length === 0 ? "Novo cliente" : undefined}
          onAction={
            canManageCustomers && items.length === 0
              ? () => {
                  setEditing(null);
                  setFormOpen(true);
                }
              : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-medium">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"
                    onClick={() => router.push(`/app/customers/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSaved={handleSaved}
      />

      <SaleFormDialog
        open={saleOpen}
        onOpenChange={setSaleOpen}
        customers={items.map((item) => ({ id: item.id, name: item.name }))}
        categories={categories}
        defaultCustomerId={saleCustomerId}
        onSaved={refresh}
      />
    </div>
  );
}
