# Guia de Configuração do Supabase

Este guia irá ajudá-lo a configurar o Supabase para o sistema de Controle de Frotas.

## Índice

1. [Criar Conta e Projeto no Supabase](#1-criar-conta-e-projeto-no-supabase)
2. [Criar as Tabelas do Banco de Dados](#2-criar-as-tabelas-do-banco-de-dados)
3. [Configurar Variáveis de Ambiente](#3-configurar-variáveis-de-ambiente)
4. [Configurar Row Level Security (RLS)](#4-configurar-row-level-security-rls)
5. [Inserir Dados Iniciais](#5-inserir-dados-iniciais)
6. [Testar a Conexão](#6-testar-a-conexão)

---

## 1. Criar Conta e Projeto no Supabase

### Passo 1: Criar Conta

1. Acesse [https://supabase.com](https://supabase.com)
2. Clique em **"Start your project"** ou **"Sign Up"**
3. Faça login com GitHub, Google ou crie uma conta com email

### Passo 2: Criar Novo Projeto

1. No Dashboard, clique em **"New Project"**
2. Preencha os campos:
   - **Name**: `controle-frotas` (ou nome de sua preferência)
   - **Database Password**: Crie uma senha forte e **guarde-a** (você precisará dela)
   - **Region**: Selecione a região mais próxima (ex: `South America (São Paulo)`)
3. Clique em **"Create new project"**
4. Aguarde alguns minutos até o projeto ser criado

---

## 2. Criar as Tabelas do Banco de Dados

### Passo 1: Acessar o SQL Editor

1. No menu lateral do Supabase, clique em **"SQL Editor"**
2. Clique em **"New query"**

### Passo 2: Executar o Script de Criação das Tabelas

Copie e cole o seguinte SQL no editor e clique em **"Run"**:

```sql
-- =============================================
-- SISTEMA DE CONTROLE DE FROTAS - CRIAÇÃO DAS TABELAS
-- =============================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Tabela: vehicles (Veículos)
-- =============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('moving', 'stopped', 'idle', 'offline')),
  ignition TEXT NOT NULL DEFAULT 'off' CHECK (ignition IN ('on', 'off')),
  current_speed REAL NOT NULL DEFAULT 0,
  speed_limit REAL NOT NULL DEFAULT 60,
  heading REAL NOT NULL DEFAULT 0,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL NOT NULL DEFAULT 10,
  battery_level INTEGER,
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_update ON vehicles(last_update);

-- =============================================
-- Tabela: alerts (Alertas)
-- =============================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('speed', 'geofence_entry', 'geofence_exit', 'geofence_dwell', 'system')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'warning', 'info')),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  vehicle_name TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  latitude REAL,
  longitude REAL,
  speed REAL,
  speed_limit REAL,
  geofence_name TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para alerts
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);

-- =============================================
-- Tabela: geofences (Cercas Virtuais)
-- =============================================
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('circle', 'polygon')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  center JSONB,
  radius REAL,
  points JSONB,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  vehicle_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  color TEXT,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para geofences
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(active);
CREATE INDEX IF NOT EXISTS idx_geofences_type ON geofences(type);

-- =============================================
-- Tabela: trips (Viagens)
-- =============================================
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_distance REAL NOT NULL DEFAULT 0,
  travel_time INTEGER NOT NULL DEFAULT 0,
  stopped_time INTEGER NOT NULL DEFAULT 0,
  average_speed REAL NOT NULL DEFAULT 0,
  max_speed REAL NOT NULL DEFAULT 0,
  stops_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para trips
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_time ON trips(start_time DESC);

-- =============================================
-- Tabela: location_points (Pontos de Localização)
-- =============================================
CREATE TABLE IF NOT EXISTS location_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  speed REAL NOT NULL DEFAULT 0,
  heading REAL NOT NULL DEFAULT 0,
  accuracy REAL,
  timestamp TIMESTAMPTZ NOT NULL
);

-- Índices para location_points
CREATE INDEX IF NOT EXISTS idx_location_points_trip_id ON location_points(trip_id);
CREATE INDEX IF NOT EXISTS idx_location_points_timestamp ON location_points(timestamp);

-- =============================================
-- Tabela: route_events (Eventos de Rota)
-- =============================================
CREATE TABLE IF NOT EXISTS route_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('departure', 'arrival', 'stop', 'speed_violation', 'geofence_entry', 'geofence_exit')),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  duration INTEGER,
  speed REAL,
  speed_limit REAL,
  geofence_name TEXT,
  address TEXT
);

-- Índices para route_events
CREATE INDEX IF NOT EXISTS idx_route_events_trip_id ON route_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_route_events_timestamp ON route_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_route_events_type ON route_events(type);

-- =============================================
-- Tabela: speed_violations (Violações de Velocidade)
-- =============================================
CREATE TABLE IF NOT EXISTS speed_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  vehicle_name TEXT NOT NULL,
  speed REAL NOT NULL,
  speed_limit REAL NOT NULL,
  excess_speed REAL NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para speed_violations
CREATE INDEX IF NOT EXISTS idx_speed_violations_vehicle_id ON speed_violations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_speed_violations_timestamp ON speed_violations(timestamp DESC);

-- =============================================
-- Tabela: users (Usuários)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =============================================
-- Funções e Triggers para atualização automática
-- =============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para vehicles
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para geofences
DROP TRIGGER IF EXISTS update_geofences_updated_at ON geofences;
CREATE TRIGGER update_geofences_updated_at
  BEFORE UPDATE ON geofences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Habilitar Realtime para a tabela vehicles
-- =============================================
-- Nota: Se aparecer erro "already member of publication", ignore - significa que já está configurado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vehicles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
  END IF;
END $$;
```

### Passo 3: Verificar Criação das Tabelas

1. No menu lateral, clique em **"Table Editor"**
2. Você deverá ver as seguintes tabelas criadas:
   - `vehicles`
   - `alerts`
   - `geofences`
   - `trips`
   - `location_points`
   - `route_events`
   - `speed_violations`
   - `users`

---

## 3. Configurar Variáveis de Ambiente

### Passo 1: Obter as Credenciais

1. No Dashboard do Supabase, vá em **Settings** (ícone de engrenagem no menu lateral)
2. Clique em **"API"** no submenu

Você precisará das seguintes informações:

| Variável | Onde Encontrar |
|----------|---------------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Project API keys > `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API keys > `service_role` `secret` |
| `DATABASE_URL` | Settings > Database > Connection string > URI |

### Passo 2: Criar Arquivo .env

Na raiz do projeto, crie um arquivo chamado `.env` com o seguinte conteúdo:

```env
# Configuração do Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui

# Configuração do Banco de Dados (para Drizzle)
DATABASE_URL=postgresql://postgres:sua-senha@db.seu-projeto.supabase.co:5432/postgres

# Configuração do Servidor
PORT=5000
NODE_ENV=development
```

**IMPORTANTE:** 
- Substitua os valores pelos obtidos no Dashboard
- **NUNCA** compartilhe ou commit o arquivo `.env` no Git
- A `SERVICE_ROLE_KEY` tem acesso total ao banco, mantenha-a em segredo

---

## 4. Configurar Row Level Security (RLS)

Para um ambiente de produção, é recomendado configurar RLS. Execute o seguinte SQL:

```sql
-- =============================================
-- CONFIGURAÇÃO DE ROW LEVEL SECURITY (RLS)
-- =============================================

-- Por enquanto, desabilitar RLS para desenvolvimento
-- Em produção, você deve criar policies apropriadas

-- Habilitar RLS em todas as tabelas
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acesso total via service_role (servidor)
-- Estas políticas permitem que o servidor acesse todos os dados

CREATE POLICY "Service role has full access to vehicles"
  ON vehicles FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to alerts"
  ON alerts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to geofences"
  ON geofences FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to trips"
  ON trips FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to location_points"
  ON location_points FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to route_events"
  ON route_events FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to speed_violations"
  ON speed_violations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);
```

---

## 5. Inserir Dados Iniciais

Para testar a aplicação, você pode inserir alguns dados de exemplo. Execute o seguinte SQL:

```sql
-- =============================================
-- DADOS INICIAIS PARA TESTE
-- =============================================

-- Inserir veículos de exemplo
INSERT INTO vehicles (name, license_plate, model, status, ignition, current_speed, speed_limit, heading, latitude, longitude, accuracy, battery_level)
VALUES 
  ('Caminhão 01', 'ABC-1234', 'Mercedes Actros', 'moving', 'on', 65, 80, 45, -23.5505, -46.6333, 10, 85),
  ('Van 02', 'DEF-5678', 'Fiat Ducato', 'stopped', 'off', 0, 60, 180, -23.5629, -46.6544, 5, 92),
  ('Carro 03', 'GHI-9012', 'Toyota Corolla', 'idle', 'on', 0, 60, 270, -23.5489, -46.6388, 8, 78),
  ('Moto 04', 'JKL-3456', 'Honda CG 160', 'moving', 'on', 45, 60, 90, -23.5570, -46.6250, 12, 65);

-- Inserir geofences de exemplo
INSERT INTO geofences (name, description, type, active, center, radius, rules, vehicle_ids, color)
VALUES 
  ('Centro de Distribuição', 'Área principal de operações', 'circle', true, 
   '{"latitude": -23.5505, "longitude": -46.6333}', 500,
   '[{"type": "entry", "enabled": true}, {"type": "exit", "enabled": true}]',
   '[]', '#3B82F6'),
  ('Zona Restrita', 'Área de acesso controlado', 'circle', true,
   '{"latitude": -23.5600, "longitude": -46.6400}', 200,
   '[{"type": "entry", "enabled": true}, {"type": "dwell", "enabled": true, "dwellTimeMinutes": 30}]',
   '[]', '#EF4444');

-- Buscar IDs dos veículos para criar alertas
DO $$
DECLARE
  v_id1 UUID;
  v_id2 UUID;
BEGIN
  SELECT id INTO v_id1 FROM vehicles WHERE license_plate = 'ABC-1234';
  SELECT id INTO v_id2 FROM vehicles WHERE license_plate = 'DEF-5678';
  
  -- Inserir alertas de exemplo
  INSERT INTO alerts (type, priority, vehicle_id, vehicle_name, message, read, latitude, longitude, speed, speed_limit)
  VALUES 
    ('speed', 'warning', v_id1, 'Caminhão 01', 'Velocidade acima do limite: 85 km/h em zona de 60 km/h', false, -23.5505, -46.6333, 85, 60);
  
  INSERT INTO alerts (type, priority, vehicle_id, vehicle_name, message, read, latitude, longitude, geofence_name)
  VALUES 
    ('geofence_exit', 'info', v_id2, 'Van 02', 'Veículo saiu da área: Centro de Distribuição', true, -23.5629, -46.6544, 'Centro de Distribuição');
END $$;
```

---

## 6. Testar a Conexão

### Passo 1: Iniciar a Aplicação

```bash
npm run dev
```

### Passo 2: Verificar Conexão

1. Acesse `http://localhost:5000` no navegador
2. Você deverá ver o dashboard com os veículos cadastrados
3. Verifique o console do servidor para mensagens de erro

### Passo 3: Testar as APIs

Você pode testar as APIs usando curl ou Postman:

```bash
# Listar veículos
curl http://localhost:5000/api/vehicles

# Listar alertas
curl http://localhost:5000/api/alerts

# Listar geofences
curl http://localhost:5000/api/geofences

# Estatísticas do dashboard
curl http://localhost:5000/api/stats
```

---

## Solução de Problemas

### Erro: "SUPABASE_URL é obrigatória"

Verifique se o arquivo `.env` existe na raiz do projeto e contém a variável `SUPABASE_URL`.

### Erro: "SUPABASE_SERVICE_ROLE_KEY é obrigatória"

Verifique se a variável `SUPABASE_SERVICE_ROLE_KEY` está configurada no `.env`.

### Erro de conexão com o banco

1. Verifique se as credenciais estão corretas
2. Verifique se o projeto Supabase está ativo
3. Verifique se as tabelas foram criadas corretamente

### Dados não aparecem no dashboard

1. Verifique se os dados foram inseridos no banco
2. Acesse o **Table Editor** no Supabase para confirmar
3. Verifique o console do navegador para erros de API

### Realtime não funciona

1. Verifique se a tabela `vehicles` está na publicação do Realtime:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
2. Se não estiver, execute:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
   ```

---

## Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

## Suporte

Em caso de dúvidas ou problemas, consulte:
- [Supabase Discord](https://discord.supabase.com/)
- [Supabase GitHub](https://github.com/supabase/supabase)


# Configuração do Supabase - VehicleTracker

Este guia explica como configurar o Supabase para usar como backend do VehicleTracker.

## 1. Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e faça login
2. Clique em **New Project**
3. Preencha as informações:
   - **Name**: VehicleTracker (ou nome de sua preferência)
   - **Database Password**: Crie uma senha forte (guarde-a!)
   - **Region**: Escolha a região mais próxima
4. Clique em **Create new project** e aguarde a criação

## 2. Criar as Tabelas

Acesse o **SQL Editor** no painel do Supabase e execute os scripts abaixo na ordem:

### 2.1. Tabela de Perfis de Usuários

```sql
-- Tabela de perfis (complemento ao auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2.2. Tabela de Veículos

```sql
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL CHECK (status IN ('moving', 'stopped', 'idle', 'offline')),
  ignition TEXT NOT NULL CHECK (ignition IN ('on', 'off')),
  current_speed NUMERIC NOT NULL DEFAULT 0,
  speed_limit NUMERIC NOT NULL DEFAULT 80,
  heading NUMERIC NOT NULL DEFAULT 0,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC NOT NULL DEFAULT 5,
  last_update TIMESTAMPTZ DEFAULT NOW(),
  battery_level NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_update ON vehicles(last_update);
```

### 2.3. Tabela de Geofences

```sql
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('circle', 'polygon')),
  active BOOLEAN NOT NULL DEFAULT true,
  center JSONB, -- {latitude: number, longitude: number}
  radius NUMERIC,
  points JSONB, -- [{latitude: number, longitude: number}, ...]
  rules JSONB NOT NULL DEFAULT '[]',
  vehicle_ids TEXT[] DEFAULT '{}',
  last_triggered TIMESTAMPTZ,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(active);
```

### 2.4. Tabela de Alertas

```sql
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('speed', 'geofence_entry', 'geofence_exit', 'geofence_dwell', 'system')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'warning', 'info')),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  vehicle_name TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN NOT NULL DEFAULT false,
  latitude NUMERIC,
  longitude NUMERIC,
  speed NUMERIC,
  speed_limit NUMERIC,
  geofence_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read);
```

### 2.5. Tabela de Viagens

```sql
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_distance NUMERIC NOT NULL,
  travel_time NUMERIC NOT NULL,
  stopped_time NUMERIC NOT NULL,
  average_speed NUMERIC NOT NULL,
  max_speed NUMERIC NOT NULL,
  stops_count INTEGER NOT NULL DEFAULT 0,
  points JSONB NOT NULL DEFAULT '[]',
  events JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_time ON trips(start_time);
```

### 2.6. Tabela de Violações de Velocidade

```sql
CREATE TABLE IF NOT EXISTS speed_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  vehicle_name TEXT NOT NULL,
  speed NUMERIC NOT NULL,
  speed_limit NUMERIC NOT NULL,
  excess_speed NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  duration NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speed_violations_vehicle_id ON speed_violations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_speed_violations_timestamp ON speed_violations(timestamp DESC);
```

## 3. Configurar Row Level Security (RLS)

O RLS garante que os dados estejam seguros. Execute os comandos abaixo:

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_violations ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles (usuário só vê/edita seu próprio perfil)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para vehicles (todos usuários autenticados podem ver/editar)
CREATE POLICY "Authenticated users can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para geofences
CREATE POLICY "Authenticated users can view geofences"
  ON geofences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage geofences"
  ON geofences FOR ALL
  TO authenticated
  USING (true);

-- Políticas para alerts
CREATE POLICY "Authenticated users can view alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage alerts"
  ON alerts FOR ALL
  TO authenticated
  USING (true);

-- Políticas para trips
CREATE POLICY "Authenticated users can view trips"
  ON trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage trips"
  ON trips FOR ALL
  TO authenticated
  USING (true);

-- Políticas para speed_violations
CREATE POLICY "Authenticated users can view violations"
  ON speed_violations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage violations"
  ON speed_violations FOR ALL
  TO authenticated
  USING (true);
```

## 4. Configurar Realtime

Para receber atualizações em tempo real dos veículos:

1. No painel do Supabase, vá em **Database** → **Replication**
2. Na seção "Tables", habilite o Realtime para:
   - `vehicles`
   - `alerts`
3. Clique em **Save**

Ou execute via SQL:

```sql
-- Habilitar publicação realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
```

## 5. Obter as Chaves de API

1. No painel do Supabase, vá em **Project Settings** → **API**
2. Copie as seguintes informações:
   - **Project URL**: URL do projeto (ex: `https://xxxxx.supabase.co`)
   - **anon public**: Chave pública (para o frontend)
   - **service_role**: Chave de serviço (⚠️ APENAS para o backend, nunca exponha!)

## 6. Configurar Variáveis de Ambiente

### Backend (arquivo `.env` na raiz do projeto)

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Server Configuration
NODE_ENV=development
PORT=5000
```

### Frontend (arquivo `.env` ou variáveis com prefixo VITE_)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

> ⚠️ **IMPORTANTE**: Nunca coloque a `service_role` key no frontend!

## 7. Inserir Dados de Teste (Opcional)

Para testar, você pode inserir alguns veículos de exemplo:

```sql
INSERT INTO vehicles (name, license_plate, model, status, ignition, current_speed, speed_limit, heading, latitude, longitude, accuracy, battery_level)
VALUES 
  ('Caminhão 01', 'ABC-1234', 'Mercedes Actros', 'moving', 'on', 72, 80, 45, -23.5489, -46.6388, 5, 85),
  ('Van 02', 'DEF-5678', 'Fiat Ducato', 'moving', 'on', 55, 60, 180, -23.5605, -46.6533, 3, 92),
  ('Caminhão 03', 'GHI-9012', 'Volvo FH', 'stopped', 'off', 0, 80, 0, -23.5305, -46.6233, 4, 78);
```

## 8. Verificar a Configuração

Após configurar, reinicie o servidor:

```bash
npm run dev
```

Você deve ver no console:
```
🚀 Using Supabase storage
Auth routes registered (Supabase configured)
Using Supabase Realtime (WebSocket disabled)
```

## Troubleshooting

### Erro: "Missing Supabase environment variables"
Verifique se as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão configuradas no `.env`.

### Erro: "Invalid API key"
Verifique se copiou as chaves corretamente do painel do Supabase.

### Realtime não funciona
1. Verifique se habilitou o Realtime para as tabelas no painel
2. Verifique se as políticas RLS permitem leitura
3. Verifique os logs do Supabase em **Logs** → **Edge Functions**

### Autenticação falha
1. Verifique se o usuário foi criado no Supabase Auth
2. Verifique as políticas RLS da tabela `profiles`
3. Verifique se o trigger de criação de perfil está funcionando

## Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
