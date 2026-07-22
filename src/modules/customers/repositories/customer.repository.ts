import type {
  CreateCustomerDTO,
  CustomerDetailDTO,
  CustomerListParams,
  CustomerResponseDTO,
  UpdateCustomerDTO,
} from "../dto/customer.dto";

export interface ICustomerRepository {
  create(companyId: string, data: CreateCustomerDTO): Promise<CustomerResponseDTO>;
  update(
    companyId: string,
    id: string,
    data: UpdateCustomerDTO,
  ): Promise<CustomerResponseDTO>;
  softDelete(companyId: string, id: string): Promise<void>;
  findById(companyId: string, id: string): Promise<CustomerResponseDTO | null>;
  list(
    companyId: string,
    params?: CustomerListParams,
  ): Promise<{ items: CustomerResponseDTO[]; total: number }>;
  getDetail(companyId: string, id: string): Promise<CustomerDetailDTO | null>;
}
