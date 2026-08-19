import { LogoutButton } from "@/modules/auth/components/logout-button";
import { Brand } from "@/shared/components/brand";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-9">
          <Brand />
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Console admin
            </span>
            <LogoutButton className="text-xs font-medium text-slate-500" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-5 lg:p-9">{children}</main>
    </div>
  );
}
