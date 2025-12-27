# Credenciais de Login (VascoTrack)

Este projeto usa autenticação própria via backend (`/api/login` e `/api/register`) e salva usuários na tabela `users` do **Supabase Postgres** (não é Supabase Auth).

## Usuário e senha de teste

- **Usuário (e-mail)**: `admin@vascotrack.local`
- **Senha**: `Admin1234`

## Como criar esse usuário no Supabase (seed)

1) Garanta que seu `.env` esteja configurado com:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

2) Rode o seed:

```bash
npm run seed:user
```

O script cria o usuário **somente se ele ainda não existir**.

## Como trocar as credenciais do seed

Você pode sobrescrever por variáveis de ambiente:

- `SEED_USER_USERNAME`
- `SEED_USER_PASSWORD`
- `SEED_USER_NAME`
- `SEED_USER_ROLE`

Exemplo (PowerShell):

```powershell
$env:SEED_USER_USERNAME="meu@email.com"
$env:SEED_USER_PASSWORD="SenhaForte1"
npm run seed:user
```

## Observação importante

Este arquivo existe apenas para facilitar ambiente de desenvolvimento. Em produção, não mantenha credenciais fixas/documentadas no repositório.
