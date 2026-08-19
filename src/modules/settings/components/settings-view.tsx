"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Bell, Building2, KeyRound, ScrollText, UserRound } from "lucide-react";
import { confirmBillingReturnAction } from "@/modules/billing/actions/confirm-billing.action";
import { PlansPanel } from "@/modules/billing/components/plans-panel";
import type { BillingOverview } from "@/modules/billing/services/billing.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { EmptyState } from "@/shared/components/empty-state";
import type { SettingsOverviewDTO } from "../dto/settings.dto";
import {
  markNotificationReadAction,
  updateCompanyProfileAction,
  updateCompanySettingsAction,
} from "../actions/settings.actions";
import {
  companyProfileSchema,
  companySettingsFormSchema,
  type CompanyProfileInput,
  type CompanySettingsFormInput,
} from "../schemas/settings.schemas";

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Funcionário",
};

export function SettingsView({
  initialData,
  billing,
  canManage,
}: {
  initialData: SettingsOverviewDTO;
  billing: BillingOverview;
  canManage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const billingStatus = searchParams.get("billing");
    const plan = searchParams.get("plan");
    if (billingStatus === "cancel") {
      toast.message("Checkout cancelado. Seu plano não foi alterado.");
      router.replace("/app/settings");
      return;
    }
    if (billingStatus === "success" && plan && canManage) {
      void (async () => {
        const result = await confirmBillingReturnAction(plan);
        if (result.success) {
          toast.success("Pagamento confirmado. Plano atualizado!");
        } else {
          toast.message(result.message);
        }
        router.replace("/app/settings");
        router.refresh();
      })();
    }
  }, [searchParams, canManage, router]);

  const profileForm = useForm<CompanyProfileInput>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      name: data.company.name,
      cnpj: data.company.cnpj ?? "",
      phone: data.company.phone ?? "",
      address: data.company.address ?? "",
      city: data.company.city ?? "",
      state: data.company.state ?? "",
      zipCode: data.company.zipCode ?? "",
    },
  });

  const settingsForm = useForm<CompanySettingsFormInput>({
    resolver: zodResolver(companySettingsFormSchema),
    defaultValues: {
      theme: (data.settings.theme === "dark" ? "dark" : "light") as "light" | "dark",
      language: data.settings.language,
      currency: data.settings.currency,
      timezone: data.settings.timezone,
      dateFormat: data.settings.dateFormat,
      notifications: data.settings.notifications,
      monthlyGoal: String(data.settings.monthlyGoal),
    },
  });

  const onSaveProfile = profileForm.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateCompanyProfileAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setData((current) => ({ ...current, company: result.data }));
      toast.success(result.message ?? "Empresa atualizada");
      router.refresh();
    });
  });

  const onSaveSettings = settingsForm.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateCompanySettingsAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setData((current) => ({ ...current, settings: result.data }));
      toast.success(result.message ?? "Preferências salvas");
      router.refresh();
    });
  });

  const markRead = (id: string) => {
    startTransition(async () => {
      const result = await markNotificationReadAction({ id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        ),
      }));
    });
  };

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em]">Configurações</h2>
        <p className="mt-1 text-sm text-slate-500">
          Empresa, preferências, notificações e trilha de auditoria.
        </p>
      </div>

      <PlansPanel
        initialBilling={billing}
        company={data.company}
        canManage={canManage}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="size-4 text-blue-600" />
          <h3 className="font-semibold">Perfil</h3>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-400">Nome</p>
            <p className="font-medium">{data.profile.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">E-mail</p>
            <p className="font-medium">{data.profile.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Papel</p>
            <p className="font-medium">{ROLE_LABEL[data.profile.role] ?? data.profile.role}</p>
          </div>
          <div className="flex items-end">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/change-password">
                <KeyRound className="mr-2 size-4" />
                Alterar senha
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="size-4 text-blue-600" />
          <h3 className="font-semibold">Empresa</h3>
        </div>
        <form onSubmit={onSaveProfile} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company-name">Nome *</Label>
            <Input
              id="company-name"
              disabled={!canManage}
              {...profileForm.register("name")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="company-cnpj">CNPJ</Label>
              <Input id="company-cnpj" disabled={!canManage} {...profileForm.register("cnpj")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-phone">Telefone</Label>
              <Input id="company-phone" disabled={!canManage} {...profileForm.register("phone")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company-address">Endereço</Label>
            <Input
              id="company-address"
              disabled={!canManage}
              {...profileForm.register("address")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="company-city">Cidade</Label>
              <Input id="company-city" disabled={!canManage} {...profileForm.register("city")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-state">UF</Label>
              <Input
                id="company-state"
                maxLength={2}
                disabled={!canManage}
                {...profileForm.register("state")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-zip">CEP</Label>
              <Input
                id="company-zip"
                disabled={!canManage}
                {...profileForm.register("zipCode")}
              />
            </div>
          </div>
          {canManage && (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                {pending ? "Salvando..." : "Salvar empresa"}
              </Button>
            </div>
          )}
        </form>
      </section>

      <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ScrollText className="size-4 text-violet-700" />
          <h3 className="font-semibold">Meta mensal de receita</h3>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Valor alvo usado no dashboard e no relatório mensal para medir o progresso do mês.
        </p>
        <div className="grid gap-2 sm:max-w-sm">
          <Label htmlFor="monthlyGoal">Meta mensal (R$)</Label>
          <Input
            id="monthlyGoal"
            disabled={!canManage}
            inputMode="decimal"
            placeholder="Ex: 10000"
            {...settingsForm.register("monthlyGoal")}
          />
          {settingsForm.formState.errors.monthlyGoal && (
            <p className="text-xs text-red-600">
              {settingsForm.formState.errors.monthlyGoal.message}
            </p>
          )}
        </div>
        {canManage && (
          <div className="mt-4">
            <Button
              type="button"
              disabled={pending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                void onSaveSettings();
              }}
            >
              {pending ? "Salvando..." : "Salvar meta e preferências"}
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ScrollText className="size-4 text-blue-600" />
          <h3 className="font-semibold">Preferências</h3>
        </div>
        <form onSubmit={onSaveSettings} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Tema</Label>
              <Select
                disabled={!canManage}
                value={settingsForm.watch("theme")}
                onValueChange={(value: "light" | "dark") =>
                  settingsForm.setValue("theme", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Moeda</Label>
              <Input
                id="currency"
                disabled={!canManage}
                {...settingsForm.register("currency")}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="language">Idioma</Label>
              <Input
                id="language"
                disabled={!canManage}
                {...settingsForm.register("language")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Fuso horário</Label>
              <Input
                id="timezone"
                disabled={!canManage}
                {...settingsForm.register("timezone")}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:max-w-sm">
            <Label htmlFor="dateFormat">Formato de data</Label>
            <Input
              id="dateFormat"
              disabled={!canManage}
              {...settingsForm.register("dateFormat")}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Notificações ativas</p>
              <p className="text-xs text-slate-400">
                Controla o flag de notificações da empresa
              </p>
            </div>
            <Switch
              checked={settingsForm.watch("notifications")}
              disabled={!canManage}
              onCheckedChange={(checked) =>
                settingsForm.setValue("notifications", checked)
              }
            />
          </div>
          {canManage && (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                {pending ? "Salvando..." : "Salvar preferências"}
              </Button>
            </div>
          )}
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="size-4 text-blue-600" />
            <h3 className="font-semibold">Notificações</h3>
          </div>
          {data.notifications.length === 0 ? (
            <EmptyState
              title="Sem notificações"
              description="Quando houver alertas, eles aparecerão aqui."
            />
          ) : (
            <div className="grid gap-3">
              {data.notifications.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.message}</p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    {!item.read && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={pending}
                        onClick={() => markRead(item.id)}
                      >
                        Marcar lida
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ScrollText className="size-4 text-blue-600" />
            <h3 className="font-semibold">Auditoria recente</h3>
          </div>
          {data.auditLogs.length === 0 ? (
            <EmptyState
              title="Sem eventos"
              description="As ações sensíveis geram registros de auditoria."
            />
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {data.auditLogs.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 px-3 py-2 text-sm"
                >
                  <p className="font-medium">
                    {item.module}.{item.action}
                    {item.entity ? ` · ${item.entity}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {item.userName ?? "Sistema"} · {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">System logs</h3>
        {data.systemLogs.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum system log ainda.</p>
        ) : (
          <div className="space-y-2">
            {data.systemLogs.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                      {item.level}
                    </span>
                    {item.message}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{item.module}</p>
                </div>
                <p className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
