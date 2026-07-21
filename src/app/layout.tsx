import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clínica Odonto — Gestão",
  description:
    "Agendamentos online, controle financeiro, clientes e muito mais. Sua clínica organizada em um único lugar.",
  icons: {
    icon: "/logo-clinica-odonto.jpg",
    apple: "/logo-clinica-odonto.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
