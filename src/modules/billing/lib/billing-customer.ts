export type BillingCustomerData = {
  name: string;
  email: string;
  cpfCnpj: string;
  phoneNumber: string;
  address: string;
  addressNumber: string;
  postalCode: string;
  province: string;
  city?: string;
};

type CompanyBillingSource = {
  name: string;
  cnpj: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
};

function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function splitAddress(addressRaw: string): { street: string; number: string } {
  const address = addressRaw.trim();
  if (!address) {
    return { street: "", number: "" };
  }

  const patterns = [
    /,\s*n[ºo°.]?\s*(\d+[A-Za-z/-]?)\s*$/i,
    /,\s*(\d+[A-Za-z/-]?)\s*$/,
    /\s+n[ºo°.]?\s*(\d+[A-Za-z/-]?)\s*$/i,
    /\s+(\d+[A-Za-z/-]?)\s*$/,
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match?.[1]) {
      return {
        street: address.slice(0, match.index).replace(/[,\s]+$/, "").trim(),
        number: match[1],
      };
    }
  }

  return { street: address, number: "" };
}

function isRepeatedDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

function mod11CheckDigit(digits: number[], factors: number[]): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * factors[index], 0);
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || isRepeatedDigits(cpf)) return false;
  const nums = cpf.split("").map(Number);
  const d1 = mod11CheckDigit(nums.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== nums[9]) return false;
  const d2 = mod11CheckDigit(nums.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === nums[10];
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || isRepeatedDigits(cnpj)) return false;
  const nums = cnpj.split("").map(Number);
  const d1 = mod11CheckDigit(
    nums.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  if (d1 !== nums[12]) return false;
  const d2 = mod11CheckDigit(
    nums.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return d2 === nums[13];
}

export function isValidCpfCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

/** Mathematically valid test CPF (sandbox). */
const SANDBOX_VALID_CPF = "52998224725";

const SANDBOX_FALLBACK: Omit<BillingCustomerData, "name" | "email"> = {
  cpfCnpj: SANDBOX_VALID_CPF,
  phoneNumber: "47999999999",
  address: "Av. Rolf Wiest",
  addressNumber: "277",
  postalCode: "81310020",
  province: "Bom Retiro",
  city: "Curitiba",
};

export function buildBillingCustomerData(input: {
  company: CompanyBillingSource;
  userName: string | null;
  userEmail: string | null;
  sandbox: boolean;
}): BillingCustomerData {
  const { company } = input;
  const cpfCnpj = onlyDigits(company.cnpj);
  const phoneNumber = onlyDigits(company.phone);
  const postalCode = onlyDigits(company.zipCode);
  const { street, number } = splitAddress(company.address ?? "");
  const city = company.city?.trim() ?? "";
  const province = city || company.state?.trim() || "";

  const data: BillingCustomerData = {
    name: input.userName?.trim() || company.name,
    email:
      input.userEmail?.trim() ||
      `billing+${onlyDigits(company.name).slice(0, 8) || "user"}@businessos.local`,
    cpfCnpj,
    phoneNumber,
    address: street || (company.address?.trim() ?? ""),
    addressNumber: number,
    postalCode,
    province,
    city: city || undefined,
  };

  const documentValid = isValidCpfCnpj(data.cpfCnpj);
  const missing: string[] = [];
  if (!documentValid) missing.push("CNPJ/CPF válido");
  if (data.phoneNumber.length < 10) missing.push("telefone");
  if (!data.address) missing.push("endereço");
  if (!data.addressNumber) missing.push("número do endereço");
  if (data.postalCode.length !== 8) missing.push("CEP");
  if (!data.province) missing.push("bairro/cidade");

  if (missing.length === 0) {
    return data;
  }

  if (input.sandbox) {
    return {
      ...data,
      // Always send a mathematically valid document in sandbox.
      cpfCnpj: documentValid ? data.cpfCnpj : SANDBOX_FALLBACK.cpfCnpj,
      phoneNumber: data.phoneNumber.length >= 10 ? data.phoneNumber : SANDBOX_FALLBACK.phoneNumber,
      address: data.address || SANDBOX_FALLBACK.address,
      addressNumber: data.addressNumber || SANDBOX_FALLBACK.addressNumber,
      postalCode: data.postalCode.length === 8 ? data.postalCode : SANDBOX_FALLBACK.postalCode,
      province: data.province || SANDBOX_FALLBACK.province,
      city: data.city || SANDBOX_FALLBACK.city,
    };
  }

  throw new Error(
    `Para assinar, preencha na empresa: ${missing.join(", ")}. Vá em Configurações → Empresa (CNPJ com dígitos válidos; endereço com número, ex: Rua Exemplo, 100).`,
  );
}
