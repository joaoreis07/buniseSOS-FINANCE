import type { Customer as PrismaCustomer } from "@prisma/client";
import type { CustomerResponseDTO } from "../dto/customer.dto";

export function toCustomerResponseDTO(customer: PrismaCustomer): CustomerResponseDTO {
  return {
    id: customer.id,
    companyId: customer.companyId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    document: customer.document,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    notes: customer.notes,
    status: customer.status,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}
