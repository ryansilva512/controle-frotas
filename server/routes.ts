import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { supabase } from "./lib/supabase";
import type { Vehicle, Alert, Geofence, Trip, LocationPoint, RouteEvent, VehicleStats, SpeedViolation } from "@shared/schema";

// ============================================
// Funções auxiliares para transformar dados do banco
// ============================================

function transformVehicle(row: any): Vehicle {
  return {
    id: row.id,
    name: row.name,
    licensePlate: row.license_plate,
    model: row.model,
    status: row.status,
    ignition: row.ignition,
    currentSpeed: row.current_speed,
    speedLimit: row.speed_limit,
    heading: row.heading,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    batteryLevel: row.battery_level,
    lastUpdate: row.last_update,
  };
}

function transformAlert(row: any): Alert {
  return {
    id: row.id,
    type: row.type,
    priority: row.priority,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    message: row.message,
    read: row.read,
    latitude: row.latitude,
    longitude: row.longitude,
    speed: row.speed,
    speedLimit: row.speed_limit,
    geofenceName: row.geofence_name,
    timestamp: row.timestamp,
  };
}

function transformGeofence(row: any): Geofence {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    active: row.active,
    center: row.center,
    radius: row.radius,
    points: row.points,
    rules: row.rules || [],
    vehicleIds: row.vehicle_ids || [],
    color: row.color,
    lastTriggered: row.last_triggered,
  };
}

function transformLocationPoint(row: any): LocationPoint {
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    speed: row.speed,
    heading: row.heading,
    timestamp: row.timestamp,
    accuracy: row.accuracy,
  };
}

function transformRouteEvent(row: any): RouteEvent {
  return {
    id: row.id,
    type: row.type,
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: row.timestamp,
    duration: row.duration,
    speed: row.speed,
    speedLimit: row.speed_limit,
    geofenceName: row.geofence_name,
    address: row.address,
  };
}

function transformSpeedViolation(row: any): SpeedViolation {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    speed: row.speed,
    speedLimit: row.speed_limit,
    excessSpeed: row.excess_speed,
    timestamp: row.timestamp,
    latitude: row.latitude,
    longitude: row.longitude,
    duration: row.duration,
  };
}

export async function registerRoutes(server: Server, app: Express) {
  // ============================================
  // Vehicle Authentication API (Mobile Access)
  // ============================================
  
  // POST /api/vehicle-auth/login - Login do veículo (mobile)
  app.post("/api/vehicle-auth/login", async (req, res) => {
    try {
      const { accessCode, pin } = req.body;
      
      if (!accessCode || !pin) {
        return res.status(400).json({ message: "Código de acesso e PIN são obrigatórios" });
      }
      
      const { data: vehicle, error } = await supabase
        .from("vehicles")
        .select("id, name, license_plate, access_code, access_pin")
        .eq("access_code", accessCode.toUpperCase())
        .single();
      
      if (error || !vehicle) {
        return res.status(401).json({ message: "Código de acesso inválido" });
      }
      
      if (vehicle.access_pin !== pin) {
        return res.status(401).json({ message: "PIN incorreto" });
      }
      
      // Atualizar último login
      await supabase
        .from("vehicles")
        .update({ last_login: new Date().toISOString() })
        .eq("id", vehicle.id);
      
      // Gerar token simples (em produção, use JWT)
      const token = Buffer.from(`${vehicle.id}:${Date.now()}`).toString("base64");
      
      res.json({
        success: true,
        token,
        vehicle: {
          id: vehicle.id,
          name: vehicle.name,
          licensePlate: vehicle.license_plate,
        },
      });
    } catch (error) {
      console.error("Erro no login do veículo:", error);
      res.status(500).json({ message: "Erro no login" });
    }
  });

  // POST /api/vehicle-auth/send-location - Enviar localização (mobile)
  app.post("/api/vehicle-auth/send-location", async (req, res) => {
    try {
      const authHeader = req.header("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token não fornecido" });
      }
      
      const token = authHeader.substring(7);
      let vehicleId: string;
      
      try {
        const decoded = Buffer.from(token, "base64").toString("utf-8");
        vehicleId = decoded.split(":")[0];
      } catch {
        return res.status(401).json({ message: "Token inválido" });
      }
      
      const { latitude, longitude, speed, heading, accuracy, batteryLevel } = req.body;
      
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: "Latitude e longitude são obrigatórios" });
      }
      
      // Determinar status baseado na velocidade
      const currentSpeed = speed || 0;
      const status = currentSpeed > 1 ? "moving" : currentSpeed > 0 ? "idle" : "stopped";
      
      const { error } = await supabase
        .from("vehicles")
        .update({
          latitude,
          longitude,
          current_speed: currentSpeed,
          heading: heading || 0,
          accuracy: accuracy || 10,
          battery_level: batteryLevel,
          status,
          ignition: currentSpeed > 0 ? "on" : "off",
          last_update: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicleId);
      
      if (error) {
        console.error("Erro ao atualizar localização:", error);
        return res.status(500).json({ message: "Erro ao atualizar localização" });
      }
      
      res.json({
        success: true,
        message: "Localização atualizada",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erro ao enviar localização:", error);
      res.status(500).json({ message: "Erro ao enviar localização" });
    }
  });

  // GET /api/vehicles/:id/credentials - Obter credenciais do veículo
  app.get("/api/vehicles/:id/credentials", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, name, license_plate, access_code, access_pin, last_login")
        .eq("id", req.params.id)
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ message: "Veículo não encontrado" });
        }
        throw error;
      }
      
      res.json({
        vehicleId: data.id,
        vehicleName: data.name,
        licensePlate: data.license_plate,
        accessCode: data.access_code,
        pin: data.access_pin,
        lastLogin: data.last_login,
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais:", error);
      res.status(500).json({ message: "Erro ao buscar credenciais" });
    }
  });

  // PATCH /api/vehicles/:id/credentials - Atualizar credenciais do veículo
  app.patch("/api/vehicles/:id/credentials", async (req, res) => {
    try {
      const { pin } = req.body;
      
      if (!pin || pin.length < 4) {
        return res.status(400).json({ message: "PIN deve ter pelo menos 4 caracteres" });
      }
      
      const { data, error } = await supabase
        .from("vehicles")
        .update({ access_pin: pin })
        .eq("id", req.params.id)
        .select("id, name, access_code, access_pin")
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ message: "Veículo não encontrado" });
        }
        throw error;
      }
      
      res.json({
        success: true,
        accessCode: data.access_code,
        pin: data.access_pin,
      });
    } catch (error) {
      console.error("Erro ao atualizar credenciais:", error);
      res.status(500).json({ message: "Erro ao atualizar credenciais" });
    }
  });

  // POST /api/vehicles/:id/regenerate-code - Regenerar código de acesso
  app.post("/api/vehicles/:id/regenerate-code", async (req, res) => {
    try {
      // Gerar novo código aleatório de 8 caracteres
      const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { data, error } = await supabase
        .from("vehicles")
        .update({ access_code: newCode })
        .eq("id", req.params.id)
        .select("id, name, access_code")
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ message: "Veículo não encontrado" });
        }
        throw error;
      }
      
      res.json({
        success: true,
        accessCode: data.access_code,
      });
    } catch (error) {
      console.error("Erro ao regenerar código:", error);
      res.status(500).json({ message: "Erro ao regenerar código" });
    }
  });

  // ============================================
  // Telemetry API
  // ============================================
  const telemetryApiKey = process.env.TELEMETRY_API_KEY;

  const telemetrySchema = z.object({
    licensePlate: z.string().min(1, "licensePlate é obrigatório"),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    speed: z.coerce.number(),
  });

  app.post("/api/telemetry", async (req, res) => {
    try {
      if (!telemetryApiKey) {
        console.warn("TELEMETRY_API_KEY não configurada");
        return res.status(500).json({ message: "Configuração ausente: TELEMETRY_API_KEY" });
      }

      const providedKey = req.header("x-api-key");
      if (!providedKey || providedKey !== telemetryApiKey) {
        return res.status(401).json({ message: "API key inválida" });
      }

      const parsed = telemetrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Payload inválido",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { licensePlate, latitude, longitude, speed } = parsed.data;

      // Log para rastreabilidade
      console.info(
        `[telemetry] ${licensePlate} lat=${latitude} lon=${longitude} speed=${speed}`,
      );

      // Normalizar placa: remover hífen e espaços, converter para maiúsculas
      const normalizedPlate = licensePlate.replace(/[-\s]/g, "").toUpperCase();

      // Buscar todos os veículos e filtrar pela placa normalizada
      const { data: allVehicles } = await supabase
        .from("vehicles")
        .select("id, license_plate");

      // Encontrar veículo cuja placa normalizada corresponda
      const matchedVehicle = allVehicles?.find((v) => {
        const dbPlateNormalized = v.license_plate.replace(/[-\s]/g, "").toUpperCase();
        return dbPlateNormalized === normalizedPlate;
      });

      let updatedVehicleId: string | null = null;

      if (matchedVehicle) {
        // Atualizar o veículo encontrado
        const vehicleId = matchedVehicle.id;
        
        // Determinar status baseado na velocidade
        const status = speed > 1 ? "moving" : speed > 0 ? "idle" : "stopped";
        
        const { error: updateError } = await supabase
          .from("vehicles")
          .update({
            latitude,
            longitude,
            current_speed: speed,
            status,
            ignition: speed > 0 ? "on" : "off",
            last_update: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", vehicleId);

        if (!updateError) {
          updatedVehicleId = vehicleId;
          console.info(`[telemetry] Veículo ${licensePlate} atualizado (id: ${vehicleId})`);
        } else {
          console.error(`[telemetry] Erro ao atualizar veículo:`, updateError);
        }
      } else {
        console.warn(`[telemetry] Veículo com placa ${licensePlate} (normalizada: ${normalizedPlate}) não encontrado no banco`);
      }

      res.status(200).json({
        message: "Telemetria recebida",
        receivedAt: new Date().toISOString(),
        vehicleUpdated: updatedVehicleId !== null,
        vehicleId: updatedVehicleId,
      });
    } catch (error) {
      console.error("Erro ao receber telemetria:", error);
      res.status(500).json({ message: "Erro ao receber telemetria" });
    }
  });

  // ============================================
  // Vehicles API
  // ============================================
  
  // GET /api/vehicles - Listar todos os veículos
  app.get("/api/vehicles", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");
      
      if (error) throw error;
      
      const vehicles = (data || []).map(transformVehicle);
      res.json(vehicles);
    } catch (error) {
      console.error("Erro ao buscar veículos:", error);
      res.status(500).json({ message: "Erro ao buscar veículos" });
    }
  });

  // GET /api/vehicles/:id - Buscar veículo por ID
  app.get("/api/vehicles/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", req.params.id)
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ message: "Veículo não encontrado" });
        }
        throw error;
      }
      
      res.json(transformVehicle(data));
    } catch (error) {
      console.error("Erro ao buscar veículo:", error);
      res.status(500).json({ message: "Erro ao buscar veículo" });
    }
  });

  // POST /api/vehicles - Criar novo veículo
  app.post("/api/vehicles", async (req, res) => {
    try {
      const { name, licensePlate, model, latitude, longitude, speedLimit } = req.body;
      
      const { data, error } = await supabase
        .from("vehicles")
        .insert({
          name,
          license_plate: licensePlate,
          model,
          latitude,
          longitude,
          speed_limit: speedLimit || 60,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(201).json(transformVehicle(data));
    } catch (error) {
      console.error("Erro ao criar veículo:", error);
      res.status(500).json({ message: "Erro ao criar veículo" });
    }
  });

  // PATCH /api/vehicles/:id - Atualizar veículo
  app.patch("/api/vehicles/:id", async (req, res) => {
    try {
      const updates: Record<string, any> = {};
      
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.licensePlate !== undefined) updates.license_plate = req.body.licensePlate;
      if (req.body.model !== undefined) updates.model = req.body.model;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.ignition !== undefined) updates.ignition = req.body.ignition;
      if (req.body.currentSpeed !== undefined) updates.current_speed = req.body.currentSpeed;
      if (req.body.speedLimit !== undefined) updates.speed_limit = req.body.speedLimit;
      if (req.body.heading !== undefined) updates.heading = req.body.heading;
      if (req.body.latitude !== undefined) updates.latitude = req.body.latitude;
      if (req.body.longitude !== undefined) updates.longitude = req.body.longitude;
      if (req.body.accuracy !== undefined) updates.accuracy = req.body.accuracy;
      if (req.body.batteryLevel !== undefined) updates.battery_level = req.body.batteryLevel;
      
      updates.last_update = new Date().toISOString();
      updates.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("vehicles")
        .update(updates)
        .eq("id", req.params.id)
        .select()
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ message: "Veículo não encontrado" });
        }
        throw error;
      }
      
      res.json(transformVehicle(data));
    } catch (error) {
      console.error("Erro ao atualizar veículo:", error);
      res.status(500).json({ message: "Erro ao atualizar veículo" });
    }
  });

  // DELETE /api/vehicles/:id - Deletar veículo
  app.delete("/api/vehicles/:id", async (req, res) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", req.params.id);
      
      if (error) throw error;
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar veículo:", error);
      res.status(500).json({ message: "Erro ao deletar veículo" });
    }
  });

  // ============================================
  // Alerts API
  // ============================================
  
  // GET /api/alerts - Listar todos os alertas
  app.get("/api/alerts", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("timestamp", { ascending: false });
      
      if (error) throw error;
      
      const alerts = (data || []).map(transformAlert);
      res.json(alerts);
    } catch (error) {
      console.error("Erro ao buscar alertas:", error);
      res.status(500).json({ message: "Erro ao buscar alertas" });
    }
  });

  // POST /api/alerts - Criar novo alerta
  app.post("/api/alerts", async (req, res) => {
    try {
      const { type, priority, vehicleId, vehicleName, message, latitude, longitude, speed, speedLimit, geofenceName } = req.body;
      
      const { data, error } = await supabase
        .from("alerts")
        .insert({
          type,
          priority,
          vehicle_id: vehicleId,
          vehicle_name: vehicleName,
          message,
          latitude,
          longitude,
          speed,
          speed_limit: speedLimit,
          geofence_name: geofenceName,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(201).json(transformAlert(data));
    } catch (error) {
      console.error("Erro ao criar alerta:", error);
      res.status(500).json({ message: "Erro ao criar alerta" });
    }
  });

  // PATCH /api/alerts/:id/read - Marcar alerta como lido
  app.patch("/api/alerts/:id/read", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("alerts")
        .update({ read: true })
        .eq("id", req.params.id)
        .select()
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ message: "Alerta não encontrado" });
        }
        throw error;
      }
      
      res.json(transformAlert(data));
    } catch (error) {
      console.error("Erro ao marcar alerta como lido:", error);
      res.status(500).json({ message: "Erro ao atualizar alerta" });
    }
  });

  // PATCH /api/alerts/read-all - Marcar todos os alertas como lidos
  app.patch("/api/alerts/read-all", async (_req, res) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ read: true })
        .eq("read", false);
      
      if (error) throw error;
      
      res.json({ message: "Todos os alertas foram marcados como lidos" });
    } catch (error) {
      console.error("Erro ao marcar alertas como lidos:", error);
      res.status(500).json({ message: "Erro ao atualizar alertas" });
    }
  });

  // DELETE /api/alerts/:id - Deletar alerta
  app.delete("/api/alerts/:id", async (req, res) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .delete()
        .eq("id", req.params.id);
      
      if (error) throw error;
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar alerta:", error);
      res.status(500).json({ message: "Erro ao deletar alerta" });
    }
  });

  // ============================================
  // Geofences API
  // ============================================
  
  // GET /api/geofences - Listar todas as geofences
  app.get("/api/geofences", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from("geofences")
        .select("*")
        .order("name");
      
      if (error) throw error;
      
      const geofences = (data || []).map(transformGeofence);
      res.json(geofences);
    } catch (error) {
      console.error("Erro ao buscar geofences:", error);
      res.status(500).json({ message: "Erro ao buscar geofences" });
    }
  });

  // GET /api/geofences/:id - Buscar geofence por ID
  app.get("/api/geofences/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("geofences")
        .select("*")
        .eq("id", req.params.id)
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ message: "Geofence não encontrada" });
        }
        throw error;
      }
      
      res.json(transformGeofence(data));
    } catch (error) {
      console.error("Erro ao buscar geofence:", error);
      res.status(500).json({ message: "Erro ao buscar geofence" });
    }
  });

  // POST /api/geofences - Criar nova geofence
  app.post("/api/geofences", async (req, res) => {
    try {
      const { name, description, type, active, center, radius, points, rules, vehicleIds, color } = req.body;
      
      const { data, error } = await supabase
        .from("geofences")
        .insert({
          name,
          description,
          type,
          active: active ?? true,
          center,
          radius,
          points,
          rules: rules || [],
          vehicle_ids: vehicleIds || [],
          color,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(201).json(transformGeofence(data));
    } catch (error) {
      console.error("Erro ao criar geofence:", error);
      res.status(500).json({ message: "Erro ao criar geofence" });
    }
  });

  // PATCH /api/geofences/:id - Atualizar geofence
  app.patch("/api/geofences/:id", async (req, res) => {
    try {
      const updates: Record<string, any> = {};
      
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.type !== undefined) updates.type = req.body.type;
      if (req.body.active !== undefined) updates.active = req.body.active;
      if (req.body.center !== undefined) updates.center = req.body.center;
      if (req.body.radius !== undefined) updates.radius = req.body.radius;
      if (req.body.points !== undefined) updates.points = req.body.points;
      if (req.body.rules !== undefined) updates.rules = req.body.rules;
      if (req.body.vehicleIds !== undefined) updates.vehicle_ids = req.body.vehicleIds;
      if (req.body.color !== undefined) updates.color = req.body.color;
      
      updates.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("geofences")
        .update(updates)
        .eq("id", req.params.id)
        .select()
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ message: "Geofence não encontrada" });
        }
        throw error;
      }
      
      res.json(transformGeofence(data));
    } catch (error) {
      console.error("Erro ao atualizar geofence:", error);
      res.status(500).json({ message: "Erro ao atualizar geofence" });
    }
  });

  // DELETE /api/geofences/:id - Deletar geofence
  app.delete("/api/geofences/:id", async (req, res) => {
    try {
      const { error } = await supabase
        .from("geofences")
        .delete()
        .eq("id", req.params.id);
      
      if (error) throw error;
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar geofence:", error);
      res.status(500).json({ message: "Erro ao deletar geofence" });
    }
  });

  // ============================================
  // Trips/History API
  // ============================================
  
  // GET /api/trips - Listar todas as viagens
  app.get("/api/trips", async (req, res) => {
    try {
      const { from, to, vehicleId } = req.query;
      
      let query = supabase
        .from("trips")
        .select("*")
        .order("start_time", { ascending: false });
      
      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId as string);
      }
      if (from) {
        query = query.gte("start_time", from as string);
      }
      if (to) {
        query = query.lte("end_time", to as string);
      }
      
      const { data: tripsData, error: tripsError } = await query;
      
      if (tripsError) throw tripsError;
      
      // Transformar dados
      const trips = (tripsData || []).map((tripRow: any) => ({
        id: tripRow.id,
        vehicleId: tripRow.vehicle_id,
        startTime: tripRow.start_time,
        endTime: tripRow.end_time,
        totalDistance: tripRow.total_distance,
        travelTime: tripRow.travel_time,
        stoppedTime: tripRow.stopped_time,
        averageSpeed: tripRow.average_speed,
        maxSpeed: tripRow.max_speed,
        stopsCount: tripRow.stops_count,
        points: [],
        events: [],
      }));
      
      res.json(trips);
    } catch (error) {
      console.error("Erro ao buscar viagens:", error);
      res.status(500).json({ message: "Erro ao buscar viagens" });
    }
  });

  // GET /api/vehicles/:id/trips - Listar viagens de um veículo
  app.get("/api/vehicles/:id/trips", async (req, res) => {
    try {
      const vehicleId = req.params.id;
      const { from, to } = req.query;
      
      let query = supabase
        .from("trips")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("start_time", { ascending: false });
      
      if (from) {
        query = query.gte("start_time", from as string);
      }
      if (to) {
        query = query.lte("end_time", to as string);
      }
      
      const { data: tripsData, error: tripsError } = await query;
      
      if (tripsError) throw tripsError;
      
      // Para cada viagem, buscar os pontos e eventos
      const trips: Trip[] = await Promise.all(
        (tripsData || []).map(async (tripRow) => {
          // Buscar pontos de localização
          const { data: pointsData } = await supabase
            .from("location_points")
            .select("*")
            .eq("trip_id", tripRow.id)
            .order("timestamp");
          
          // Buscar eventos
          const { data: eventsData } = await supabase
            .from("route_events")
            .select("*")
            .eq("trip_id", tripRow.id)
            .order("timestamp");
          
          return {
            id: tripRow.id,
            vehicleId: tripRow.vehicle_id,
            startTime: tripRow.start_time,
            endTime: tripRow.end_time,
            totalDistance: tripRow.total_distance,
            travelTime: tripRow.travel_time,
            stoppedTime: tripRow.stopped_time,
            averageSpeed: tripRow.average_speed,
            maxSpeed: tripRow.max_speed,
            stopsCount: tripRow.stops_count,
            points: (pointsData || []).map(transformLocationPoint),
            events: (eventsData || []).map(transformRouteEvent),
          };
        })
      );
      
      res.json(trips);
    } catch (error) {
      console.error("Erro ao buscar viagens:", error);
      res.status(500).json({ message: "Erro ao buscar viagens" });
    }
  });

  // ============================================
  // Reports API
  // ============================================
  
  // GET /api/reports/speed-stats - Estatísticas de velocidade
  app.get("/api/reports/speed-stats", async (req, res) => {
    try {
      const { from, to } = req.query;
      
      let query = supabase
        .from("speed_violations")
        .select("*");
      
      if (from) {
        query = query.gte("timestamp", from as string);
      }
      if (to) {
        query = query.lte("timestamp", to as string);
      }
      
      const { data: violations, error } = await query;
      
      if (error) throw error;
      
      const violationsArray = violations || [];
      
      // Calcular estatísticas
      const totalViolations = violationsArray.length;
      const vehiclesWithViolations = new Set(violationsArray.map(v => v.vehicle_id)).size;
      const averageExcessSpeed = totalViolations > 0
        ? violationsArray.reduce((sum, v) => sum + v.excess_speed, 0) / totalViolations
        : 0;
      
      // Agrupar por dia
      const violationsByDay: { date: string; count: number }[] = [];
      const dayMap = new Map<string, number>();
      
      violationsArray.forEach(v => {
        const date = v.timestamp.split("T")[0];
        dayMap.set(date, (dayMap.get(date) || 0) + 1);
      });
      
      dayMap.forEach((count, date) => {
        violationsByDay.push({ date, count });
      });
      
      violationsByDay.sort((a, b) => a.date.localeCompare(b.date));
      
      // Top violadores
      const vehicleViolations = new Map<string, { vehicleName: string; count: number; totalExcess: number; lastViolation: string }>();
      
      violationsArray.forEach(v => {
        const existing = vehicleViolations.get(v.vehicle_id);
        if (!existing) {
          vehicleViolations.set(v.vehicle_id, {
            vehicleName: v.vehicle_name,
            count: 1,
            totalExcess: v.excess_speed,
            lastViolation: v.timestamp,
          });
        } else {
          existing.count++;
          existing.totalExcess += v.excess_speed;
          if (v.timestamp > existing.lastViolation) {
            existing.lastViolation = v.timestamp;
          }
        }
      });
      
      const topViolators = Array.from(vehicleViolations.entries())
        .map(([vehicleId, data]) => ({
          vehicleId,
          vehicleName: data.vehicleName,
          totalViolations: data.count,
          averageExcessSpeed: data.totalExcess / data.count,
          lastViolation: data.lastViolation,
        }))
        .sort((a, b) => b.totalViolations - a.totalViolations)
        .slice(0, 10);
      
      const stats: VehicleStats = {
        totalViolations,
        vehiclesWithViolations,
        averageExcessSpeed,
        violationsByDay,
        topViolators,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // GET /api/reports/violations - Listar violações
  app.get("/api/reports/violations", async (req, res) => {
    try {
      const { from, to } = req.query;
      
      let query = supabase
        .from("speed_violations")
        .select("*")
        .order("timestamp", { ascending: false });
      
      if (from) {
        query = query.gte("timestamp", from as string);
      }
      if (to) {
        query = query.lte("timestamp", to as string);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const violations = (data || []).map(transformSpeedViolation);
      res.json(violations);
    } catch (error) {
      console.error("Erro ao buscar violações:", error);
      res.status(500).json({ message: "Erro ao buscar violações" });
    }
  });

  // ============================================
  // Dashboard Stats API
  // ============================================
  
  // GET /api/stats - Estatísticas do dashboard
  app.get("/api/stats", async (_req, res) => {
    try {
      // Buscar contagens de veículos
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, status");
      
      if (vehiclesError) throw vehiclesError;
      
      const vehicles = vehiclesData || [];
      const totalVehicles = vehicles.length;
      const activeVehicles = vehicles.filter(v => v.status !== "offline").length;
      const movingVehicles = vehicles.filter(v => v.status === "moving").length;
      
      // Buscar contagens de alertas
      const { data: alertsData, error: alertsError } = await supabase
        .from("alerts")
        .select("id, read");
      
      if (alertsError) throw alertsError;
      
      const alerts = alertsData || [];
      const totalAlerts = alerts.length;
      const unreadAlerts = alerts.filter(a => !a.read).length;
      
      // Buscar contagens de geofences
      const { data: geofencesData, error: geofencesError } = await supabase
        .from("geofences")
        .select("id, active");
      
      if (geofencesError) throw geofencesError;
      
      const geofences = geofencesData || [];
      const totalGeofences = geofences.length;
      const activeGeofences = geofences.filter(g => g.active).length;
      
      res.json({
        totalVehicles,
        activeVehicles,
        movingVehicles,
        totalAlerts,
        unreadAlerts,
        totalGeofences,
        activeGeofences,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // ============================================
  // WebSocket para atualizações em tempo real
  // ============================================
  
  const wss = new WebSocketServer({ server, path: "/ws" });
  
  // Armazenar clientes conectados
  const clients = new Set<WebSocket>();
  
  wss.on("connection", async (ws) => {
    console.log("Cliente WebSocket conectado");
    clients.add(ws);

    // Enviar dados iniciais
    try {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");
      
      if (data) {
        const vehicles = data.map(transformVehicle);
        ws.send(JSON.stringify({ type: "vehicles", data: vehicles }));
      }
    } catch (error) {
      console.error("Erro ao enviar dados iniciais:", error);
    }

    ws.on("close", () => {
      clients.delete(ws);
      console.log("Cliente WebSocket desconectado");
    });

    ws.on("error", (error) => {
      console.error("Erro no WebSocket:", error);
      clients.delete(ws);
    });
  });

  // Função para broadcast de atualizações para todos os clientes
  let isBroadcasting = false;
  
  async function broadcastVehicleUpdates() {
    if (clients.size === 0) return;
    if (isBroadcasting) return; // Evita execuções sobrepostas
    
    isBroadcasting = true;
    try {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");
      
      if (data) {
        const vehicles = data.map(transformVehicle);
        const message = JSON.stringify({ type: "vehicles", data: vehicles });
        
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    } catch (error) {
      console.error("Erro ao buscar veículos para broadcast:", error);
    } finally {
      isBroadcasting = false;
    }
  }

  // Configurar Supabase Realtime para atualizações automáticas
  const channel = supabase
    .channel("vehicles-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "vehicles" },
      () => {
        broadcastVehicleUpdates();
      }
    )
    .subscribe();

  // Fallback: Atualizar a cada 5 segundos se Realtime não estiver funcionando
  setInterval(broadcastVehicleUpdates, 5000);
}
