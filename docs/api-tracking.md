## Endpoint de Telemetria

Endpoint para receber a posição e velocidade atuais de um veículo. Não há persistência — os dados são validados, autenticados e apenas confirmados.

### URL e método
- `POST /api/telemetry`

### Autenticação
- Header `x-api-key` deve ser igual à variável de ambiente `TELEMETRY_API_KEY`.
- Se `TELEMETRY_API_KEY` não estiver configurada, o endpoint retornará erro 500.

### Payload (JSON)
- `licensePlate` (string, obrigatório)
- `latitude` (number, obrigatório)
- `longitude` (number, obrigatório)
- `speed` (number, obrigatório)

### Respostas
- 200: `{"message":"Telemetria recebida","receivedAt":"<ISO8601>"}`  
- 400: Payload inválido (erros de validação)  
- 401: API key inválida  
- 500: Falha interna ou API key ausente no servidor

### Exemplo `curl`
```bash
curl -X POST https://<seu-host>/api/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: $TELEMETRY_API_KEY" \
  -d '{
    "licensePlate": "ABC1234",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "speed": 72.4
  }'
```

### Notas
- Ajuste `TELEMETRY_API_KEY` no ambiente do servidor (ex.: `.env`).
- O endpoint retorna apenas confirmação e loga a entrada para rastreabilidade; não salva no banco.
- Certifique-se de enviar `Content-Type: application/json` e números no corpo (strings serão convertidas). 

