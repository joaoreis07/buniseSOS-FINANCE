import type {
  CategoryResponseDTO,
  CreateCategoryDTO,
  CreateTransactionDTO,
  TransactionListParams,
  TransactionResponseDTO,
  UpdateCategoryDTO,
  UpdateTransactionDTO,
} from "../dto/finance.dto";

export interface ICategoryRepository {
  create(companyId: string, data: CreateCategoryDTO): Promise<CategoryResponseDTO>;
  update(companyId: string, id: string, data: UpdateCategoryDTO): Promise<CategoryResponseDTO>;
  softDelete(companyId: string, id: string): Promise<void>;
  findById(companyId: string, id: string): Promise<CategoryResponseDTO | null>;
  list(companyId: string, type?: "INCOME" | "EXPENSE"): Promise<CategoryResponseDTO[]>;
}

export interface ITransactionRepository {
  create(companyId: string, data: CreateTransactionDTO): Promise<TransactionResponseDTO>;
  update(
    companyId: string,
    id: string,
    data: UpdateTransactionDTO,
  ): Promise<TransactionResponseDTO>;
  softDelete(companyId: string, id: string): Promise<void>;
  findById(companyId: string, id: string): Promise<TransactionResponseDTO | null>;
  list(
    companyId: string,
    params?: TransactionListParams,
  ): Promise<{ items: TransactionResponseDTO[]; total: number }>;
}
