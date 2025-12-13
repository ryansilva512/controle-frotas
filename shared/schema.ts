import { z } from "zod";
import { pgTable, text, timestamp, boolean, real, integer, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ============================================
// Tipos de Enums
// ============================================
export type VehicleStatus = "moving" | "stopped" | "idle" | "offline";
export type IgnitionStatus = "on" | "off";
export type AlertType = "speed" | "geofence_entry" | "geofence_exit" | "geofence_dwell" | "system";
export type AlertPriority = "critical" | "warning" | "info";
export type GeofenceType = "circle" | "polygon";
export type GeofenceRuleType = "entry" | "exit" | "dwell" | "time_violation";
export type RouteEventType = "departure" | "arrival" | "stop" | "speed_violation" | "geofence_entry" | "geofence_exit";

// ============================================
// Tabelas Drizzle (PostgreSQL)
// ============================================

// Tabela de Veículos
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  licensePlate: text("license_plate").notNull(),
  model: text("model"),
  status: text("status").$type<VehicleStatus>().notNull().default("offline"),
  ignition: text("ignition").$type<IgnitionStatus>().notNull().default("off"),
  isConnected: boolean("is_connected").notNull().default(false),
  currentSpeed: real("current_speed").notNull().default(0),
  speedLimit: real("speed_limit").notNull().default(60),
  heading: real("heading").notNull().default(0),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  accuracy: real("accuracy").notNull().default(10),
  batteryLevel: integer("battery_level"),
  lastUpdate: timestamp("last_update").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tabela de Alertas
export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").$type<AlertType>().notNull(),
  priority: text("priority").$type<AlertPriority>().notNull(),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
  vehicleName: text("vehicle_name").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  latitude: real("latitude"),
  longitude: real("longitude"),
  speed: real("speed"),
  speedLimit: real("speed_limit"),
  geofenceName: text("geofence_name"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tabela de Geofences
export const geofences = pgTable("geofences", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").$type<GeofenceType>().notNull(),
  active: boolean("active").notNull().default(true),
  center: jsonb("center").$type<{ latitude: number; longitude: number } | null>(),
  radius: real("radius"),
  points: jsonb("points").$type<{ latitude: number; longitude: number }[] | null>(),
  rules: jsonb("rules").$type<GeofenceRule[]>().notNull().default([]),
  vehicleIds: jsonb("vehicle_ids").$type<string[]>().notNull().default([]),
  color: text("color"),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tabela de Viagens
export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  totalDistance: real("total_distance").notNull().default(0),
  travelTime: integer("travel_time").notNull().default(0), // em segundos
  stoppedTime: integer("stopped_time").notNull().default(0), // em segundos
  averageSpeed: real("average_speed").notNull().default(0),
  maxSpeed: real("max_speed").notNull().default(0),
  stopsCount: integer("stops_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tabela de Pontos de Localização
export const locationPoints = pgTable("location_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  speed: real("speed").notNull().default(0),
  heading: real("heading").notNull().default(0),
  accuracy: real("accuracy"),
  timestamp: timestamp("timestamp").notNull(),
});

// Tabela de Eventos de Rota
export const routeEvents = pgTable("route_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  type: text("type").$type<RouteEventType>().notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  duration: integer("duration"), // em segundos
  speed: real("speed"),
  speedLimit: real("speed_limit"),
  geofenceName: text("geofence_name"),
  address: text("address"),
});

// Tabela de Violações de Velocidade
export const speedViolations = pgTable("speed_violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
  vehicleName: text("vehicle_name").notNull(),
  speed: real("speed").notNull(),
  speedLimit: real("speed_limit").notNull(),
  excessSpeed: real("excess_speed").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  duration: integer("duration").notNull().default(0), // em segundos
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tabela de Usuários
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================
// Schemas Zod para Validação
// ============================================

// Vehicle Schemas
export const vehicleSchema = z.object({
  id: z.string(),
  name: z.string(),
  licensePlate: z.string(),
  model: z.string().optional().nullable(),
  status: z.enum(["moving", "stopped", "idle", "offline"]),
  ignition: z.enum(["on", "off"]),
  isConnected: z.boolean(),
  currentSpeed: z.number(),
  speedLimit: z.number(),
  heading: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  lastUpdate: z.string(),
  batteryLevel: z.number().optional().nullable(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;

export const insertVehicleSchema = vehicleSchema.omit({ id: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

// Location Point Schema
export const locationPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  speed: z.number(),
  heading: z.number(),
  timestamp: z.string(),
  accuracy: z.number().optional().nullable(),
});

export type LocationPoint = z.infer<typeof locationPointSchema>;

// Route Event Schema
export const routeEventSchema = z.object({
  id: z.string(),
  type: z.enum(["departure", "arrival", "stop", "speed_violation", "geofence_entry", "geofence_exit"]),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.string(),
  duration: z.number().optional().nullable(),
  speed: z.number().optional().nullable(),
  speedLimit: z.number().optional().nullable(),
  geofenceName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export type RouteEvent = z.infer<typeof routeEventSchema>;

// Trip Schema
export const tripSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  totalDistance: z.number(),
  travelTime: z.number(),
  stoppedTime: z.number(),
  averageSpeed: z.number(),
  maxSpeed: z.number(),
  stopsCount: z.number(),
  points: z.array(locationPointSchema),
  events: z.array(routeEventSchema),
});

export type Trip = z.infer<typeof tripSchema>;

// Geofence Rule Schema
export const geofenceRuleSchema = z.object({
  type: z.enum(["entry", "exit", "dwell", "time_violation"]),
  enabled: z.boolean(),
  dwellTimeMinutes: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  toleranceSeconds: z.number().optional(),
});

export type GeofenceRule = z.infer<typeof geofenceRuleSchema>;

// Geofence Schema
export const geofenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  type: z.enum(["circle", "polygon"]),
  active: z.boolean(),
  center: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional().nullable(),
  radius: z.number().optional().nullable(),
  points: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
  })).optional().nullable(),
  rules: z.array(geofenceRuleSchema),
  vehicleIds: z.array(z.string()),
  lastTriggered: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export type Geofence = z.infer<typeof geofenceSchema>;

export const insertGeofenceSchema = geofenceSchema.omit({ id: true });
export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;

// Alert Schema
export const alertSchema = z.object({
  id: z.string(),
  type: z.enum(["speed", "geofence_entry", "geofence_exit", "geofence_dwell", "system"]),
  priority: z.enum(["critical", "warning", "info"]),
  vehicleId: z.string(),
  vehicleName: z.string(),
  message: z.string(),
  timestamp: z.string(),
  read: z.boolean(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  speed: z.number().optional().nullable(),
  speedLimit: z.number().optional().nullable(),
  geofenceName: z.string().optional().nullable(),
});

export type Alert = z.infer<typeof alertSchema>;

export const insertAlertSchema = alertSchema.omit({ id: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;

// Speed Violation Schema
export const speedViolationSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  vehicleName: z.string(),
  speed: z.number(),
  speedLimit: z.number(),
  excessSpeed: z.number(),
  timestamp: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  duration: z.number(),
});

export type SpeedViolation = z.infer<typeof speedViolationSchema>;

// Vehicle Stats Schema
export const vehicleStatsSchema = z.object({
  totalViolations: z.number(),
  vehiclesWithViolations: z.number(),
  averageExcessSpeed: z.number(),
  violationsByDay: z.array(z.object({
    date: z.string(),
    count: z.number(),
  })),
  topViolators: z.array(z.object({
    vehicleId: z.string(),
    vehicleName: z.string(),
    totalViolations: z.number(),
    averageExcessSpeed: z.number(),
    lastViolation: z.string(),
  })),
});

export type VehicleStats = z.infer<typeof vehicleStatsSchema>;

// User Schema
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };
