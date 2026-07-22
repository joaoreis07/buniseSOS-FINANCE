"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Receipt, Search, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import {
  globalSearchAction,
  type GlobalSearchResult,
} from "../actions/global-search.action";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const next = await globalSearchAction(query);
        setResults(next);
      });
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [query, open]);

  const customers = results.filter((item) => item.type === "customer");
  const transactions = results.filter((item) => item.type === "transaction");
  const categories = results.filter((item) => item.type === "category");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 transition hover:bg-white md:flex"
      >
        <Search className="size-4" />
        <span>Pesquisar...</span>
        <kbd className="ml-6 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Pesquisa global"
        description="Busque clientes, transações e categorias"
      >
        <CommandInput
          placeholder="Buscar clientes, transações, categorias..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {pending ? "Buscando..." : query.length < 2 ? "Digite ao menos 2 caracteres" : "Nenhum resultado"}
          </CommandEmpty>
          {customers.length > 0 && (
            <CommandGroup heading="Clientes">
              {customers.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.subtitle}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <Users className="size-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {transactions.length > 0 && (
            <CommandGroup heading="Transações">
              {transactions.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.subtitle}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <Receipt className="size-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {categories.length > 0 && (
            <CommandGroup heading="Categorias">
              {categories.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.subtitle}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <FolderOpen className="size-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
