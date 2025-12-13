# API de Acesso Mobile para Veículos

Este documento descreve as APIs para autenticação e envio de localização via aplicativo mobile.

## Visão Geral

Cada veículo possui credenciais únicas para autenticar e enviar dados de localização:
- **Código de Acesso**: Código alfanumérico de 8 caracteres (único por veículo)
- **PIN**: Senha numérica (padrão: 1234, pode ser alterada)

## Endpoints

### 1. Login do Veículo

**Autenticar o veículo e obter token de acesso.**

```
POST /api/vehicle-auth/login
```

#### Request Body
```json
{
  "accessCode": "ABC12345",
  "pin": "1234"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `accessCode` | string | Sim | Código de acesso do veículo |
| `pin` | string | Sim | PIN do veículo |

#### Respostas

**200 OK** - Login bem-sucedido
```json
{
  "success": true,
  "token": "MmVmYjIzODctZTM1Ni00NmYxLWJlZmItMzAwMDRhZjRiYjgzOjE3MDIzMjE0NTY=",
  "vehicle": {
    "id": "2efb2387-e356-46f1-befb-30004af4bb83",
    "name": "Carro 01",
    "licensePlate": "ABC-1234"
  }
}
```

**401 Unauthorized** - Credenciais inválidas
```json
{
  "message": "Código de acesso inválido"
}
```
ou
```json
{
  "message": "PIN incorreto"
}
```

---

### 2. Enviar Localização

**Enviar a posição atual do veículo.**

```
POST /api/vehicle-auth/send-location
```

#### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request Body
```json
{
  "latitude": -3.1190,
  "longitude": -60.0217,
  "speed": 45.5,
  "heading": 120,
  "accuracy": 10,
  "batteryLevel": 85
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `latitude` | number | Sim | Latitude em graus decimais |
| `longitude` | number | Sim | Longitude em graus decimais |
| `speed` | number | Não | Velocidade em km/h (padrão: 0) |
| `heading` | number | Não | Direção em graus (0-360, padrão: 0) |
| `accuracy` | number | Não | Precisão do GPS em metros (padrão: 10) |
| `batteryLevel` | number | Não | Nível de bateria do dispositivo (0-100) |

#### Respostas

**200 OK** - Localização atualizada
```json
{
  "success": true,
  "message": "Localização atualizada",
  "timestamp": "2025-12-13T20:15:30.000Z"
}
```

**401 Unauthorized** - Token inválido
```json
{
  "message": "Token não fornecido"
}
```

---

### 3. Obter Credenciais do Veículo (Admin)

**Consultar as credenciais de acesso de um veículo.**

```
GET /api/vehicles/:id/credentials
```

#### Resposta

**200 OK**
```json
{
  "vehicleId": "2efb2387-e356-46f1-befb-30004af4bb83",
  "vehicleName": "Carro 01",
  "licensePlate": "ABC-1234",
  "accessCode": "ABC12345",
  "pin": "1234",
  "lastLogin": "2025-12-13T18:30:00.000Z"
}
```

---

### 4. Atualizar PIN (Admin)

**Alterar o PIN de acesso do veículo.**

```
PATCH /api/vehicles/:id/credentials
```

#### Request Body
```json
{
  "pin": "5678"
}
```

#### Resposta

**200 OK**
```json
{
  "success": true,
  "accessCode": "ABC12345",
  "pin": "5678"
}
```

---

### 5. Regenerar Código de Acesso (Admin)

**Gerar um novo código de acesso para o veículo.**

```
POST /api/vehicles/:id/regenerate-code
```

#### Resposta

**200 OK**
```json
{
  "success": true,
  "accessCode": "XYZ98765"
}
```

---

## Fluxo de Uso no App Mobile

### 1. Primeiro Acesso
1. O administrador acessa o sistema web
2. Seleciona o veículo → aba "Mobile" (📱)
3. Copia o **Código de Acesso** e **PIN**
4. Informa ao motorista

### 2. No Celular
1. Abre o app de rastreamento
2. Digita o Código de Acesso e PIN
3. App faz login e recebe o token
4. App começa a enviar localização periodicamente

### 3. Código de Exemplo (JavaScript/React Native)

```javascript
// Login
const login = async (accessCode, pin) => {
  const response = await fetch('https://seu-servidor/api/vehicle-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode, pin })
  });
  const data = await response.json();
  return data.token;
};

// Enviar localização
const sendLocation = async (token, position) => {
  await fetch('https://seu-servidor/api/vehicle-auth/send-location', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speed: position.coords.speed || 0,
      heading: position.coords.heading || 0,
      accuracy: position.coords.accuracy
    })
  });
};

// Exemplo de uso
const token = await login('ABC12345', '1234');

// Enviar a cada 10 segundos
setInterval(async () => {
  const position = await navigator.geolocation.getCurrentPosition();
  await sendLocation(token, position);
}, 10000);
```

---

## Segurança

- O token é válido enquanto o código de acesso não for regenerado
- Em produção, considere implementar JWT com expiração
- O PIN pode ser alterado a qualquer momento pelo administrador
- Regenerar o código de acesso invalida o token anterior

---

## Integração com a Interface Web

As credenciais podem ser gerenciadas na interface web:

1. Acesse o **Dashboard**
2. Clique em um veículo na lista
3. No painel de detalhes, clique na aba **📱 (Mobile)**
4. Visualize/copie o código de acesso e PIN
5. Altere o PIN ou regenere o código conforme necessário

