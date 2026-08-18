"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { EmptyState } from "@/shared/components/empty-state";
import type { CustomerClientDTO } from "@/modules/customers/dto/customer.dto";
import { getCustomerDetailAction } from "@/modules/customers/actions/customer.actions";
import { CustomerFormDialog } from "@/modules/customers/components/customer-form-dialog";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/modules/finance/types";
import type { CustomerCrmDetailDTO, InstallmentDTO, SaleDTO } from "../dto/crm.dto";
import { CustomerInstallmentsBoard } from "./customer-installments-board";
import { EditInstallmentDialog } from "./edit-installment-dialog";
import { EditSaleDialog } from "./edit-sale-dialog";
import { FinancialStatusBadge } from "./financial-status-badge";
import { ReceiveInstallmentDialog } from "./receive-installment-dialog";
import { SaleFormDialog } from "./sale-form-dialog";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function paymentLabel(method: string | null): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

export function CustomerCrmDetailView({
  initialData,
  categories,
  canManageFinance,
  canManageCustomers,
}: {
  initialData: CustomerCrmDetailDTO;
  categories: Array<{ id: string; name: string }>;
  canManageFinance: boolean;
  canManageCustomers: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const [saleOpen, setSaleOpen] = useState(false);
  const [editSaleOpen, setEditSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerClientDTO | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [editInstallmentOpen, setEditInstallmentOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentDTO | null>(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const openEditCustomer = () => {
    startTransition(async () => {
      const result = await getCustomerDetailAction({ id: data.customer.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setEditing(result.data.customer);
      setFormOpen(true);
    });
  };

  const handleCustomerSaved = (customer: CustomerClientDTO) => {
    setData((current) => ({
      ...current,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        document: customer.document,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        notes: customer.notes,
      },
      notes: customer.notes,
    }));
    refresh();
  };

  const { customer, summary } = data;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app/customers"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="size-4" />
            Voltar para clientes
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">{customer.name}</h2>
            <FinancialStatusBadge status={summary.financialStatus} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[customer.phone ?? customer.whatsapp, customer.email, customer.document]
              .filter(Boolean)
              .join(" · ") || "Sem contato cadastrado"}
            {" · "}
            vendas e parcelas deste cliente
            {pending ? " · atualizando..." : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageCustomers && (
            <Button
              type="button"
              variant="outline"
              onClick={openEditCustomer}
              disabled={pending}
              className="rounded-xl"
            >
              <Pencil className="mr-2 size-4" />
              Editar cliente
            </Button>
          )}
          {canManageFinance && (
            <Button
              type="button"
              onClick={() => setSaleOpen(true)}
              className="rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Plus className="mr-2 size-4" />
              Nova venda
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total comprado" value={summary.formattedTotalPurchased} />
        <StatCard label="Total pago" value={summary.formattedTotalPaid} />
        <StatCard label="Saldo devedor" value={summary.formattedBalanceDue} />
        <StatCard label="Quantidade de compras" value={String(summary.salesCount)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Parcelas pagas" value={String(summary.paidInstallments)} />
        <StatCard label="Parcelas pendentes" value={String(summary.pendingInstallments)} />
        <StatCard label="Parcelas vencidas" value={String(summary.overdueInstallments)} />
      </div>

      <Tabs defaultValue="sales" className="grid gap-4">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="sales" className="rounded-xl px-4 py-2">
            Compras
          </TabsTrigger>
          <TabsTrigger value="installments" className="rounded-xl px-4 py-2">
            Parcelas
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-xl px-4 py-2">
            Histórico
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-xl px-4 py-2">
            Observações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-0">
          {data.sales.length === 0 ? (
            <EmptyState
              title="Nenhuma compra registrada"
              description="Registre a primeira venda deste cliente."
              actionLabel={canManageFinance ? "Nova venda" : undefined}
              onAction={canManageFinance ? () => setSaleOpen(true) : undefined}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Categoria</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Pagamento</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    {canManageFinance ? (
                      <th className="px-4 py-3 font-medium">Ações</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {data.sales.map((sale) => (
                    <tr key={sale.id} className="border-t border-slate-100">
                      <td className="px-4 py-3.5 font-medium">{sale.description}</td>
                      <td className="px-4 py-3.5 text-slate-500">{sale.categoryName ?? "—"}</td>
                      <td className="px-4 py-3.5">{sale.formattedTotalAmount}</td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {sale.paymentMode === "CASH"
                          ? "À vista"
                          : `${sale.installmentsCount}x`}{" "}
                        · {paymentLabel(sale.paymentMethod)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{formatDate(sale.soldAt)}</td>
                      {canManageFinance ? (
                        <td className="px-4 py-3.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => {
                              setSelectedSale(sale);
                              setEditSaleOpen(true);
                            }}
                          >
                            <Pencil className="mr-1.5 size-3.5" />
                            Editar
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="installments" className="mt-0">
          <CustomerInstallmentsBoard
            board={data.installmentBoard}
            payments={data.payments}
            canManageFinance={canManageFinance}
            onReceive={(item) => {
              setSelectedInstallment(item);
              setReceiveOpen(true);
            }}
            onEdit={(item) => {
              setSelectedInstallment(item);
              setEditInstallmentOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          {data.timeline.length === 0 ? (
            <EmptyState title="Sem histórico" description="Eventos do cliente aparecerão aqui." />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ol className="relative space-y-5 border-l border-slate-200 pl-5">
                {data.timeline.map((item) => (
                  <li key={item.id} className="relative">
                    <span className="absolute -left-[1.41rem] top-1.5 size-2.5 rounded-full bg-blue-600" />
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{item.detail}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(item.at)}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm whitespace-pre-wrap text-slate-600">
              {data.notes?.trim() || "Nenhuma observação cadastrada para este cliente."}
            </p>
            {(customer.address || customer.city || customer.state) && (
              <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
                <p className="font-medium text-slate-700">Endereço</p>
                <p className="mt-1">
                  {[customer.address, customer.city, customer.state].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <SaleFormDialog
        open={saleOpen}
        onOpenChange={setSaleOpen}
        customers={[{ id: customer.id, name: customer.name }]}
        categories={categories}
        defaultCustomerId={customer.id}
        onSaved={refresh}
      />

      <EditSaleDialog
        open={editSaleOpen}
        onOpenChange={setEditSaleOpen}
        sale={selectedSale}
        categories={categories}
        onSaved={refresh}
      />

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSaved={handleCustomerSaved}
      />

      <ReceiveInstallmentDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        installment={selectedInstallment}
        onSaved={refresh}
      />

      <EditInstallmentDialog
        open={editInstallmentOpen}
        onOpenChange={setEditInstallmentOpen}
        installment={selectedInstallment}
        onSaved={refresh}
      />
    </div>
  );
}
