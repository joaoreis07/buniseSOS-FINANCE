# BusinessOS Finance

SaaS financeiro multi-empresa (MVP em construção).

## Stack (Etapa 1)

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Docker Compose (PostgreSQL 16)

## Setup

> **Nota:** este projeto usa `.npmrc` com `ignore-workspace=true` para não herdar um `pnpm-workspace.yaml` que possa existir na pasta pai.

```bash
# Dependências (use pnpm; se não estiver no PATH: npx pnpm install)
pnpm install

# Variáveis de ambiente
cp .env.example .env

# PostgreSQL (requer Docker Desktop instalado e em execução)
pnpm db:up

# Desenvolvimento
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

- Landing: `/`
- Dashboard (UI estática nesta etapa): `/app`

### Docker

O arquivo `docker-compose.yml` sobe PostgreSQL 16 com healthcheck. Nesta etapa o banco **ainda não é usado pela aplicação** — só a infraestrutura fica pronta para a Etapa 2.

**Pré-requisitos no Windows:**

1. Docker Desktop instalado
2. WSL 2 instalado (`wsl --install` no PowerShell como Administrador, depois reiniciar)
3. Docker Desktop aberto e engine Linux em execução

```bash
pnpm db:up      # docker compose up -d
pnpm db:logs    # logs do Postgres
pnpm db:down    # para o container
```

Credenciais padrão (ver `.env.example`):

- User/Password: `businessos` / `businessos`
- Database: `businessos_finance`
- Port: `5432`

## Scripts

| Script | Descrição |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm start` | Servidor de produção |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
| `pnpm db:up` | Sobe Postgres via Docker |
| `pnpm db:down` | Para o container |

## Estrutura

```text
src/
  app/           # rotas Next.js
  modules/       # domínios (auth, dashboard, finance, …)
  shared/        # UI, lib, hooks compartilhados
prisma/          # reservado (Etapa 2+)
```
