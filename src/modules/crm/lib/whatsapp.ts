export type WhatsAppTemplate =
  | "DUE_TODAY"
  | "DUE_TOMORROW"
  | "OVERDUE"
  | "THANKS";

function digitsOnly(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`;
  }
  return digits;
}

export function buildWhatsAppMessage(input: {
  template: WhatsAppTemplate;
  customerName: string;
  amountLabel: string;
  dueDateLabel?: string;
}): string {
  const firstName = input.customerName.trim().split(/\s+/)[0] || "cliente";
  switch (input.template) {
    case "DUE_TOMORROW":
      return `Olá ${firstName}!\n\nLembramos que sua parcela de ${input.amountLabel} vence amanhã${
        input.dueDateLabel ? ` (${input.dueDateLabel})` : ""
      }.\n\nCaso o pagamento já tenha sido realizado, desconsidere esta mensagem.\n\nObrigado!`;
    case "OVERDUE":
      return `Olá ${firstName}!\n\nIdentificamos que sua parcela de ${input.amountLabel} está em atraso${
        input.dueDateLabel ? ` (venc. ${input.dueDateLabel})` : ""
      }.\n\nPor favor, entre em contato para regularizar.\n\nObrigado!`;
    case "THANKS":
      return `Olá ${firstName}!\n\nRecebemos o pagamento da parcela de ${input.amountLabel}. Muito obrigado!\n\nQualquer dúvida, estamos à disposição.`;
    case "DUE_TODAY":
    default:
      return `Olá ${firstName}!\n\nIdentificamos que sua parcela de ${input.amountLabel} vence hoje.\n\nCaso o pagamento já tenha sido realizado, desconsidere esta mensagem.\n\nObrigado!`;
  }
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = digitsOnly(phone);
  if (normalized.length < 12) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function resolveWhatsAppTemplate(status: string, dueDateIso: string): WhatsAppTemplate {
  if (status === "OVERDUE") return "OVERDUE";
  if (status === "PAID") return "THANKS";
  const due = new Date(dueDateIso);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((startDue.getTime() - startToday.getTime()) / 86400000);
  if (diffDays === 1) return "DUE_TOMORROW";
  return "DUE_TODAY";
}
