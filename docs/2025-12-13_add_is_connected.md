# Migração: Adicionar coluna is_connected

**Data:** 2025-12-13

## Objetivo
Adicionar campo `is_connected` na tabela `vehicles` para indicar quando um veículo está logado/conectado na plataforma. Veículos conectados são exibidos com status **azul** no frontend.

## Comando SQL Executado

```sql
ALTER TABLE vehicles ADD COLUMN is_connected BOOLEAN NOT NULL DEFAULT false;
```

## Endpoints Modificados

### POST /api/vehicle-auth/login
- Atualizado para setar `is_connected = true` ao fazer login

### POST /api/vehicle-auth/send-location
- Atualizado para manter `is_connected = true` ao enviar localização

### POST /api/telemetry
- Atualizado para setar `is_connected = true` ao receber telemetria
- Permite que veículos que não usam autenticação sejam marcados como conectados

### POST /api/vehicle-auth/logout (NOVO)
- Novo endpoint para fazer logout do veículo
- Seta `is_connected = false`
- Requer Bearer token no header Authorization

## Desconexão Automática por Inatividade

Um job automático roda a cada **10 segundos** verificando veículos que:
- Estão marcados como `is_connected = true`
- Não enviaram dados (`last_update`) há mais de **60 segundos**

Esses veículos são automaticamente marcados como `is_connected = false`, simulando um logout/desconexão automática.

**Configuração:**
- **Timeout de inatividade:** 60 segundos
- **Intervalo de verificação:** 10 segundos

Isso garante que quando o usuário deslogar do app mobile (ou fechar o app), após 60 segundos sem enviar dados, o veículo será automaticamente marcado como desconectado.

## Arquivos Modificados

- `shared/schema.ts` - Adicionado campo `isConnected` no tipo Vehicle
- `server/routes.ts` - Atualizado transformVehicle, login, send-location, telemetry, novo logout, novo job de desconexão automática
- `client/src/pages/home.tsx` - Status azul para veículos conectados, card de estatística "Conectados"
- `client/src/pages/vehicles.tsx` - Status azul para veículos conectados

## Uso do Endpoint de Logout

```bash
curl -X POST https://<host>/api/vehicle-auth/logout \
  -H "Authorization: Bearer <token>"
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```
