export type CompanyProfileClientDTO = {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
};

export type CompanySettingsClientDTO = {
  id: string;
  companyId: string;
  theme: string;
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  notifications: boolean;
  monthlyGoal: number;
  createdAt: string;
  updatedAt: string;
};

export type NotificationClientDTO = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type AuditLogClientDTO = {
  id: string;
  module: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  userName: string | null;
  createdAt: string;
};

export type SystemLogClientDTO = {
  id: string;
  level: string;
  module: string;
  message: string;
  createdAt: string;
};

export type SettingsOverviewDTO = {
  company: CompanyProfileClientDTO;
  settings: CompanySettingsClientDTO;
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
  notifications: NotificationClientDTO[];
  auditLogs: AuditLogClientDTO[];
  systemLogs: SystemLogClientDTO[];
};
