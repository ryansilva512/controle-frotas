# API de Rastreamento - VehicleTracker

Este documento descreve como utilizar o endpoint de rastreamento para enviar dados de localização de veículos.

## Visão Geral

O endpoint de rastreamento permite que dispositivos GPS enviem dados de localização dos veículos em tempo real. A API atualiza a posição, velocidade e status do veículo no sistema.

## Configuração

### Variável de Ambiente

Antes de usar a API, configure a variável de ambiente `TRACKING_API_KEY` no arquivo `.env`:

```env
# API Key para autenticação do endpoint de rastreamento
TRACKING_API_KEY=sua-api-key-secreta-aqui
```

> ⚠️ **Importante**: Use uma chave forte e mantenha-a em segredo. Recomenda-se uma string aleatória de pelo menos 32 caracteres.

## Endpoint

### POST /api/tracking

Atualiza a localização de um veículo no sistema.

#### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `Content-Type` | string | Sim | Deve ser `application/json` |
| `X-API-Key` | string | Sim | API Key configurada no servidor |

#### Body (JSON)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `licensePlate` | string | Sim | Placa do veículo (ex: "ABC-1234") |
| `latitude` | number | Sim | Latitude (-90 a 90) |
| `longitude` | number | Sim | Longitude (-180 a 180) |
| `speed` | number | Sim | Velocidade atual em km/h (>= 0) |

#### Exemplo de Requisição

```bash
curl -X POST http://localhost:5000/api/tracking \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-api-key-secreta-aqui" \
  -d '{
    "licensePlate": "ABC-1234",
    "latitude": -23.5489,
    "longitude": -46.6388,
    "speed": 60
  }'
```

## Respostas

### Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Localização atualizada com sucesso",
  "vehicle": {
    "id": "uuid-do-veiculo",
    "name": "Caminhão 01",
    "licensePlate": "ABC-1234",
    "latitude": -23.5489,
    "longitude": -46.6388,
    "currentSpeed": 60,
    "status": "moving",
    "lastUpdate": "2024-12-06T15:30:00.000Z"
  }
}
```

### Erros

#### 400 Bad Request - Dados Inválidos

```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "field": "licensePlate",
      "message": "Placa é obrigatória"
    }
  ]
}
```

#### 401 Unauthorized - API Key Inválida ou Ausente

```json
{
  "error": "API Key não fornecida. Use o header X-API-Key."
}
```

ou

```json
{
  "error": "API Key inválida"
}
```

#### 404 Not Found - Veículo Não Encontrado

```json
{
  "error": "Veículo não encontrado",
  "message": "Nenhum veículo cadastrado com a placa \"XYZ-9999\""
}
```

#### 500 Internal Server Error

```json
{
  "error": "Erro interno do servidor",
  "message": "Falha ao processar os dados de rastreamento"
}
```

## Comportamento Automático

### Atualização de Status

O status do veículo é atualizado automaticamente baseado na velocidade:

| Velocidade | Status |
|------------|--------|
| 0 km/h | `stopped` |
| > 0 km/h | `moving` |

### Timestamp

O campo `lastUpdate` é atualizado automaticamente com a data/hora do servidor no momento da requisição.

## Exemplos de Uso

### Python

```python
import requests

url = "http://localhost:5000/api/tracking"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "sua-api-key-secreta-aqui"
}
data = {
    "licensePlate": "ABC-1234",
    "latitude": -23.5489,
    "longitude": -46.6388,
    "speed": 60
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:5000/api/tracking', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'sua-api-key-secreta-aqui'
  },
  body: JSON.stringify({
    licensePlate: 'ABC-1234',
    latitude: -23.5489,
    longitude: -46.6388,
    speed: 60
  })
});

const result = await response.json();
console.log(result);
```

### Arduino/ESP32 (C++)

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

void sendLocation(float lat, float lng, float speed) {
  HTTPClient http;
  http.begin("http://seu-servidor:5000/api/tracking");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", "sua-api-key-secreta-aqui");
  
  StaticJsonDocument<200> doc;
  doc["licensePlate"] = "ABC-1234";
  doc["latitude"] = lat;
  doc["longitude"] = lng;
  doc["speed"] = speed;
  
  String json;
  serializeJson(doc, json);
  
  int httpCode = http.POST(json);
  
  if (httpCode == 200) {
    Serial.println("Localização enviada com sucesso!");
  } else {
    Serial.printf("Erro: %d\n", httpCode);
  }
  
  http.end();
}
```

## Boas Práticas

1. **Frequência de Envio**: Recomenda-se enviar dados a cada 5-30 segundos, dependendo da necessidade de precisão.

2. **Retry Logic**: Implemente lógica de retry em caso de falhas de rede.

3. **Buffer Local**: Armazene dados localmente quando offline e envie em lote quando a conexão for restaurada.

4. **Validação Local**: Valide os dados antes de enviar para evitar requisições desnecessárias.

5. **Segurança**: 
   - Nunca exponha a API Key no código do frontend
   - Use HTTPS em produção
   - Rotacione a API Key periodicamente

## Troubleshooting

### A API retorna 401 mesmo com a API Key correta

- Verifique se a variável `TRACKING_API_KEY` está configurada no `.env`
- Confirme que o servidor foi reiniciado após adicionar a variável
- Verifique se não há espaços extras na API Key

### O veículo não é encontrado

- Confirme que a placa está cadastrada no sistema
- A busca não diferencia maiúsculas/minúsculas
- Verifique a formatação da placa (ex: "ABC-1234" ou "ABC1234")

### As atualizações não aparecem no mapa

- Verifique se o Supabase Realtime está configurado
- Confirme que o veículo está com status diferente de "offline"
- Atualize a página do dashboard
