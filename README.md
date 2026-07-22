# BusinessOS Finance

SaaS multi-tenant de gestão financeira (MVP produção).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Prisma 6 + PostgreSQL 16 (Docker Compose)
- Auth.js (Credentials + JWT)
- Zod + React Hook Form + TanStack Query/Table
- Recharts + Sonner + Motion

## Setup

> Este projeto usa `.npmrc` com `ignore-workspace=true` para não herdar um `pnpm-workspace.yaml` da pasta pai.

```bash
# Dependências (se pnpm não estiver no PATH: npx pnpm@9.15.9 install)
pnpm install

# Variáveis de ambiente
cp .env.example .env

# PostgreSQL (Docker Desktop aberto)
pnpm db:up

# Schema + dados demo
pnpm db:migrate
pnpm db:seed

# Desenvolvimento
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Contas demo (seed)

| Email | Senha | Role |
|---|---|---|
| `admin@businessos.demo` | `Demo@123456` | ADMIN |
| `gerente@businessos.demo` | `Demo@123456` | MANAGER |
| `funcionario@businessos.demo` | `Demo@123456` | EMPLOYEE |

Segunda empresa para isolamento: `admin@outra.demo` / `Demo@123456`.

### Rotas principais

| Rota | Descrição |
|---|---|
| `/` | Landing |
| `/login` `/register` | Autenticação |
| `/forgot-password` `/reset-password` `/verify-email` | Recuperação / verificação |
| `/change-password` | Alterar senha (autenticado) |
| `/app` | Dashboard (KPIs reais) |
| `/app/customers` | Clientes + histórico financeiro |
| `/app/finance` | Receitas, despesas, categorias e fluxo |
| `/app/settings` | Empresa, preferências, notificações e auditoria |

Em desenvolvimento, e-mails são impressos no console do servidor (fallback sem Resend).

## Docker

`docker-compose.yml` sobe PostgreSQL 16 com healthcheck.

**Windows:**

1. Docker Desktop instalado
2. WSL 2 (`wsl --install`, reiniciar)
3. Docker Desktop aberto (engine Linux)

```bash
pnpm db:up
pnpm db:logs
pnpm db:down
pnpm db:migrate
pnpm db:seed
```

Credenciais padrão (`.env.example`):

- User/Password: `businessos` / `businessos`
- Database: `businessos_finance`
- Port: `5432`

## Scripts

| Script | Descrição |
|---|---|
| `pnpm dev` | Desenvolvimento |
| `pnpm build` / `pnpm start` | Produção |
| `pnpm lint` / `pnpm typecheck` | Qualidade |
| `pnpm db:up` / `db:down` / `db:logs` | Docker Postgres |
| `pnpm db:migrate` / `db:seed` / `db:studio` | Prisma |
| `pnpm db:verify` | Isolamento tenant + soft delete |
| `pnpm db:verify:rbac` | Matriz de permissões |
| `pnpm db:verify:dashboard` | KPIs do seed |
| `pnpm db:verify:customers` | CRUD clientes |
| `pnpm db:verify:finance` | CRUD financeiro + audit |
| `pnpm db:verify:settings` | Settings + logs |
| `pnpm smoke:e2e` | Fluxo register → KPIs → cliente → transação → settings |

## APIs internas

- `GET /api/dashboard`
- `GET/POST /api/customers` · `GET/PATCH/DELETE /api/customers/[id]`
- `GET/POST /api/finance` · `GET/PATCH/DELETE /api/finance/[id]` · `GET/POST /api/finance/categories`
- `GET/PATCH /api/settings`

Todas exigem sessão Auth.js e respeitam RBAC + `companyId`.

## Estrutura

```text
src/
  app/           # rotas Next.js + APIs
  modules/       # auth, dashboard, customers, finance, settings, app-shell
  shared/        # UI, lib (auth, rbac, prisma, storage), repositories
prisma/          # schema, migrations, seed, verifies, smoke E2E
```

## RBAC (resumo)

| | Admin | Gerente | Funcionário |
|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ |
| Clientes | ✓ | ✓ | ver |
| Financeiro | ✓ | ✓ | — |
| Settings | ✓ | ✓ | — |

## Storage

Interface `StorageProvider` em `src/shared/lib/storage` com implementação local (`LocalStorageProvider`) pronta para anexos futuros.
