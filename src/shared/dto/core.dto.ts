export type CreateUserDTO = {
  name?: string | null;
  email: string;
  passwordHash?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
};

export type UpdateUserDTO = Partial<CreateUserDTO>;

export type UserResponseDTO = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCompanyDTO = {
  name: string;
  logo?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  plan?: "STARTER" | "PROFESSIONAL" | "BUSINESS" | "ENTERPRISE";
  subscriptionStatus?: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";
};

export type UpdateCompanyDTO = Partial<CreateCompanyDTO>;

export type CompanyResponseDTO = {
  id: string;
  name: string;
  logo: string | null;
  cnpj: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  plan: "STARTER" | "PROFESSIONAL" | "BUSINESS" | "ENTERPRISE";
  subscriptionStatus: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";
  createdAt: Date;
  updatedAt: Date;
};

export type CompanySettingsDTO = {
  theme: string;
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  notifications: boolean;
  monthlyGoal: number;
};

export type UpdateCompanySettingsDTO = Partial<CompanySettingsDTO>;

export type CompanySettingsResponseDTO = CompanySettingsDTO & {
  id: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
};
