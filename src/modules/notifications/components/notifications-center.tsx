"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Bell,
  CheckCheck,
  CircleDollarSign,
  Handshake,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import type { NotificationCategory } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
  deleteNotificationAction,
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationItemDTO,
} from "../actions/notifications.actions";

const FILTERS: Array<{ key: NotificationCategory | "ALL"; label: string }> = [
  { key: "ALL", label: "Todas" },
  { key: "FINANCE", label: "Financeiro" },
  { key: "CUSTOMERS", label: "Clientes" },
  { key: "INSTALLMENTS", label: "Parcelas" },
  { key: "SYSTEM", label: "Sistema" },
];

function categoryIcon(category: NotificationCategory) {
  switch (category) {
    case "FINANCE":
      return CircleDollarSign;
    case "CUSTOMERS":
      return Users;
    case "INSTALLMENTS":
      return Handshake;
    default:
      return Settings;
  }
}

function categoryColor(category: NotificationCategory): string {
  switch (category) {
    case "FINANCE":
      return "bg-emerald-50 text-emerald-700";
    case "CUSTOMERS":
      return "bg-blue-50 text-blue-700";
    case "INSTALLMENTS":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function NotificationsCenter() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationCategory | "ALL">("ALL");
  const [items, setItems] = useState<NotificationItemDTO[]>([]);
  const [pending, startTransition] = useTransition();

  const load = (nextFilter = filter) => {
    startTransition(async () => {
      const data = await listNotificationsAction({ category: nextFilter });
      setItems(data);
    });
  };

  useEffect(() => {
    if (open) load(filter);
  }, [open, filter]);

  const unread = items.filter((item) => !item.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        className="relative grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notificações"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-blue-600" />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fechar notificações"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Avisos importantes</p>
                <p className="text-xs text-slate-500">
                  {unread > 0
                    ? `${unread} aviso(s) novo(s) — toque para ler`
                    : "Nenhum aviso novo"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-lg text-xs"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await markAllNotificationsReadAction();
                    toast.success("Todas marcadas como lidas");
                    load();
                  });
                }}
              >
                <CheckCheck className="mr-1 size-3.5" />
                Ler todas
              </Button>
            </div>

            <div className="flex flex-wrap gap-1 border-b border-slate-100 px-3 py-2">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    filter === item.key
                      ? "bg-blue-600 text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  Nenhuma notificação por aqui.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const Icon = categoryIcon(item.category);
                    return (
                      <li
                        key={item.id}
                        className={`flex gap-3 px-4 py-3 ${item.read ? "bg-white" : "bg-blue-50/40"}`}
                      >
                        <span
                          className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${categoryColor(item.category)}`}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                              if (!item.read) {
                                startTransition(async () => {
                                  await markNotificationReadAction(item.id);
                                  load();
                                });
                              }
                            }}
                          >
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-0.5 text-xs leading-5 text-slate-600">{item.message}</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {formatWhen(item.createdAt)}
                            </p>
                          </button>
                        </div>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-rose-600"
                          aria-label="Excluir"
                          onClick={() => {
                            startTransition(async () => {
                              await deleteNotificationAction(item.id);
                              load();
                            });
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
