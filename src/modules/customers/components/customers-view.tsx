"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Plus, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
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
import type { CustomerClientDTO } from "../dto/customer.dto";
import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerDetailSheet } from "./customer-detail-sheet";
import { CustomerStatusBadge } from "./customer-status-badge";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export function CustomersView({
  initialItems,
  initialTotal,
  initialSearch,
  canManage,
}: {
  initialItems: CustomerClientDTO[];
  initialTotal: number;
  initialSearch: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "BLOCKED">("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerClientDTO | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (status !== "ALL" && item.status !== status) return false;
      if (!query) return true;
      return [item.name, item.email, item.phone, item.document]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query));
    });
  }, [items, search, status]);

  const columns = useMemo<ColumnDef<CustomerClientDTO>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Cliente",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900">{row.original.name}</p>
            <p className="text-xs text-slate-400">
              {[row.original.city, row.original.state].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Contato",
        cell: ({ row }) => (
          <div className="text-sm">
            <p>{row.original.email ?? "—"}</p>
            <p className="text-xs text-slate-400">{row.original.phone ?? "—"}</p>
          </div>
        ),
      },
      {
        accessorKey: "document",
        header: "Documento",
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">{row.original.document ?? "—"}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <CustomerStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: "Desde",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500">{formatDate(row.original.createdAt)}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (customer: CustomerClientDTO) => {
    setDetailOpen(false);
    setEditing(customer);
    setFormOpen(true);
  };

  const handleSaved = (customer: CustomerClientDTO) => {
    setItems((current) => {
      const exists = current.some((item) => item.id === customer.id);
      if (exists) {
        return current.map((item) => (item.id === customer.id ? customer : item));
      }
      return [customer, ...current];
    });
    setTotal((value) => (items.some((item) => item.id === customer.id) ? value : value + 1));
    router.refresh();
  };

  const handleDeleted = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setTotal((value) => Math.max(0, value - 1));
    router.refresh();
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Clientes</h2>
          <p className="mt-1 text-sm text-slate-500">
            {total} cliente{total === 1 ? "" : "s"} · cadastro e histórico financeiro
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          >
            <Plus className="mr-2 size-4" />
            Novo cliente
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail, telefone..."
            className="h-11 rounded-xl pl-10"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value: "ALL" | "ACTIVE" | "INACTIVE" | "BLOCKED") => {
            setStatus(value);
          }}
        >
          <SelectTrigger className="h-11 w-[160px] rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ACTIVE">Ativos</SelectItem>
            <SelectItem value="INACTIVE">Inativos</SelectItem>
            <SelectItem value="BLOCKED">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum resultado"}
          description={
            items.length === 0
              ? "Comece cadastrando o primeiro cliente da sua base."
              : "Ajuste a busca ou o filtro de status."
          }
          icon={Users}
          actionLabel={canManage && items.length === 0 ? "Novo cliente" : undefined}
          onAction={canManage && items.length === 0 ? openCreate : undefined}
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
                    onClick={() => {
                      setDetailId(row.original.id);
                      setDetailOpen(true);
                    }}
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

      <CustomerDetailSheet
        customerId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        canManage={canManage}
        onEdit={openEdit}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
