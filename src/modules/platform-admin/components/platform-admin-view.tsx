"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  CreditCard,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  removePlatformTenantAction,
  restorePlatformTenantAction,
  updatePlatformTenantAction,
} from "../actions/platform-admin.actions";
import type { PlatformAdminOverviewDTO, PlatformTenantDTO } from "../dto/platform-admin.dto";

const PLAN_OPTIONS = [
  { value: "STARTER", label: "Starter" },
  { value: "PROFESSIONAL", label: "Profissional" },
  { value: "BUSINESS", label: "Business" },
  { value: "ENTERPRISE", label: "Enterprise" },
] as const;

const STATUS_OPTIONS = [
  { value: "TRIALING", label: "Trial" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "PAST_DUE", label: "Em atraso" },
  { value: "CANCELED", label: "Cancelado" },
  { value: "INCOMPLETE", label: "Incompleto" },
] as const;

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function TenantRow({
  tenant,
  onChanged,
}: {
  tenant: PlatformTenantDTO;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [plan, setPlan] = useState(tenant.plan);
  const [status, setStatus] = useState(tenant.subscriptionStatus);

  const save = () => {
    startTransition(async () => {
      const result = await updatePlatformTenantAction({
        companyId: tenant.id,
        plan,
        subscriptionStatus: status,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Salvo");
      onChanged();
    });
  };

  const remove = () => {
    if (
      !window.confirm(
        `Remover a empresa "${tenant.name}"? Os usuários dela não conseguirão mais entrar.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await removePlatformTenantAction({ companyId: tenant.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Removida");
      onChanged();
    });
  };

  const restore = () => {
    startTransition(async () => {
      const result = await restorePlatformTenantAction({ companyId: tenant.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Restaurada");
      onChanged();
    });
  };

  return (
    <tr className={tenant.isRemoved ? "bg-rose-50/40" : undefined}>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-slate-900">{tenant.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {tenant.ownerName ?? "Sem nome"} · {tenant.ownerEmail ?? "sem e-mail"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Cadastro {tenant.createdAtLabel}
          {tenant.isRemoved ? " · removida" : ""}
        </p>
      </td>
      <td className="px-4 py-4 align-top text-sm text-slate-600">
        <p>{tenant.userCount} usuário(s)</p>
        <p className="text-xs text-slate-400">{tenant.customerCount} clientes CRM</p>
      </td>
      <td className="px-4 py-4 align-top">
        {tenant.isRemoved ? (
          <p className="text-sm text-slate-500">
            {tenant.planName} · {tenant.statusLabel}
          </p>
        ) : (
          <div className="grid gap-2">
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
              value={plan}
              disabled={pending}
              onChange={(event) => setPlan(event.target.value as typeof plan)}
            >
              {PLAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
              value={status}
              disabled={pending}
              onChange={(event) => setStatus(event.target.value as typeof status)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          {!tenant.isRemoved && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={pending || (plan === tenant.plan && status === tenant.subscriptionStatus)}
                onClick={save}
              >
                Salvar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="rounded-xl"
                disabled={pending}
                onClick={remove}
              >
                <Trash2 className="size-3.5" />
                Remover
              </Button>
            </>
          )}
          {tenant.isRemoved && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={pending}
              onClick={restore}
            >
              <RotateCcw className="size-3.5" />
              Restaurar
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function PlatformAdminView({ initialData }: { initialData: PlatformAdminOverviewDTO }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);

  const tenants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialData.tenants.filter((item) => {
      if (!showRemoved && item.isRemoved) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.ownerEmail?.toLowerCase().includes(q) ?? false) ||
        (item.ownerName?.toLowerCase().includes(q) ?? false) ||
        (item.cnpj?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [initialData.tenants, query, showRemoved]);

  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Shield className="size-3.5" />
            Admin da plataforma
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em]">Clientes BusinessOS</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe cadastros, assinaturas e remova empresas quando necessário.
          </p>
        </div>
        <Link href="/app" className="text-sm font-semibold text-blue-600 hover:underline">
          Voltar ao app →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Empresas ativas" value={initialData.totals.companies} icon={Building2} />
        <StatCard label="Assinaturas ativas" value={initialData.totals.active} icon={CreditCard} />
        <StatCard label="Planos pagos" value={initialData.totals.paid} icon={Users} />
        <StatCard label="Novas (7 dias)" value={initialData.totals.newThisWeek} icon={UserPlus} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="text-slate-500">Em trial</p>
          <p className="mt-1 text-xl font-semibold">{initialData.totals.trialing}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="text-slate-500">Canceladas</p>
          <p className="mt-1 text-xl font-semibold">{initialData.totals.canceled}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="text-slate-500">Removidas</p>
          <p className="mt-1 text-xl font-semibold">{initialData.totals.removed}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar empresa, dono ou e-mail..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showRemoved}
              onChange={(event) => setShowRemoved(event.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            Mostrar removidas
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Empresa / dono</th>
                <th className="px-4 py-3 font-medium">Uso</th>
                <th className="px-4 py-3 font-medium">Plano / status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <TenantRow key={tenant.id} tenant={tenant} onChanged={refresh} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
