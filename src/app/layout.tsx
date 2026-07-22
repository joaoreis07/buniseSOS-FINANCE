import type { Metadata } from "next";
import { AppProviders } from "@/shared/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "BusinessOS Finance",
  description:
    "Controle financeiro para tirar o caixa do papel: receitas, despesas, clientes, saldo e histórico em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
