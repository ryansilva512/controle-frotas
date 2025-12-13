## Endpoint de Telemetria

Endpoint para receber a posição e velocidade atuais de um veículo e atualizar automaticamente no banco de dados.

### URL e método
- `POST /api/telemetry`

### Autenticação
- Header `x-api-key` deve ser igual à variável de ambiente `TELEMETRY_API_KEY`.
- Se `TELEMETRY_API_KEY` não estiver configurada, o endpoint retornará erro 500.

### Payload (JSON)
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `licensePlate` | string | Sim | Placa do veículo (com ou sem hífen) |
| `latitude` | number | Sim | Latitude em graus decimais |
| `longitude` | number | Sim | Longitude em graus decimais |
| `speed` | number | Sim | Velocidade atual em km/h |

### Comportamento
1. Valida autenticação via `x-api-key`
2. Valida o payload recebido
3. Busca o veículo pela placa (busca flexível: com ou sem hífen)
4. Se encontrado, atualiza:
   - `latitude`, `longitude`, `current_speed`
   - `status`: "moving" (speed > 1), "idle" (0 < speed ≤ 1), "stopped" (speed = 0)
   - `ignition`: "on" (speed > 0), "off" (speed = 0)
   - `last_update`: timestamp atual
5. Retorna confirmação indicando se o veículo foi atualizado

### Respostas

**200 OK** - Telemetria recebida
```json
{
  "message": "Telemetria recebida",
  "receivedAt": "2025-12-06T21:43:22.758Z",
  "vehicleUpdated": true,
  "vehicleId": "2efb2387-e356-46f1-befb-30004af4bb83"
}
```

**400 Bad Request** - Payload inválido
```json
{
  "message": "Payload inválido",
  "errors": { "licensePlate": ["licensePlate é obrigatório"] }
}
```

**401 Unauthorized** - API key inválida
```json
{ "message": "API key inválida" }
```

**500 Internal Server Error** - Falha interna ou API key ausente
```json
{ "message": "Configuração ausente: TELEMETRY_API_KEY" }
```

### Exemplo `curl`
```bash
curl -X POST https://<seu-host>/api/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: $TELEMETRY_API_KEY" \
  -d '{
    "licensePlate": "ABC1234",
    "latitude": -3.1047,
    "longitude": -60.0213,
    "speed": 72.4
  }'
```

### Notas
- Ajuste `TELEMETRY_API_KEY` no ambiente do servidor (ex.: `.env`).
- A busca pela placa é flexível: `ABC1234` encontra veículos com placa `ABC-1234` e vice-versa.
- Se o veículo não existir no banco, a telemetria é registrada no log mas `vehicleUpdated` será `false`.
- Certifique-se de enviar `Content-Type: application/json` e números no corpo (strings serão convertidas).
