import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string;
      role: Role;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    companyId: string;
    role: Role;
    emailVerified: Date | null;
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    companyId?: string;
    role?: Role;
    emailVerified?: Date | null;
    sessionVersion?: number;
    invalidated?: boolean;
  }
}
