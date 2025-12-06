// Tipos gerados para o Supabase Database
// Estes tipos representam a estrutura das tabelas no banco de dados

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type VehicleStatus = 'moving' | 'stopped' | 'idle' | 'offline';
export type IgnitionStatus = 'on' | 'off';
export type AlertType = 'speed' | 'geofence_entry' | 'geofence_exit' | 'geofence_dwell' | 'system';
export type AlertPriority = 'critical' | 'warning' | 'info';
export type GeofenceType = 'circle' | 'polygon';
export type RouteEventType = 'departure' | 'arrival' | 'stop' | 'speed_violation' | 'geofence_entry' | 'geofence_exit';

export interface Database {
  public: {
    Tables: {
      vehicles: {
        Row: {
          id: string
          name: string
          license_plate: string
          model: string | null
          status: VehicleStatus
          ignition: IgnitionStatus
          current_speed: number
          speed_limit: number
          heading: number
          latitude: number
          longitude: number
          accuracy: number
          battery_level: number | null
          last_update: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          license_plate: string
          model?: string | null
          status?: VehicleStatus
          ignition?: IgnitionStatus
          current_speed?: number
          speed_limit?: number
          heading?: number
          latitude: number
          longitude: number
          accuracy?: number
          battery_level?: number | null
          last_update?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          license_plate?: string
          model?: string | null
          status?: VehicleStatus
          ignition?: IgnitionStatus
          current_speed?: number
          speed_limit?: number
          heading?: number
          latitude?: number
          longitude?: number
          accuracy?: number
          battery_level?: number | null
          last_update?: string
          created_at?: string
          updated_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          type: AlertType
          priority: AlertPriority
          vehicle_id: string
          vehicle_name: string
          message: string
          read: boolean
          latitude: number | null
          longitude: number | null
          speed: number | null
          speed_limit: number | null
          geofence_name: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          type: AlertType
          priority: AlertPriority
          vehicle_id: string
          vehicle_name: string
          message: string
          read?: boolean
          latitude?: number | null
          longitude?: number | null
          speed?: number | null
          speed_limit?: number | null
          geofence_name?: string | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          type?: AlertType
          priority?: AlertPriority
          vehicle_id?: string
          vehicle_name?: string
          message?: string
          read?: boolean
          latitude?: number | null
          longitude?: number | null
          speed?: number | null
          speed_limit?: number | null
          geofence_name?: string | null
          timestamp?: string
          created_at?: string
        }
      }
      geofences: {
        Row: {
          id: string
          name: string
          description: string | null
          type: GeofenceType
          active: boolean
          center: Json | null
          radius: number | null
          points: Json | null
          rules: Json
          vehicle_ids: Json
          color: string | null
          last_triggered: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type: GeofenceType
          active?: boolean
          center?: Json | null
          radius?: number | null
          points?: Json | null
          rules?: Json
          vehicle_ids?: Json
          color?: string | null
          last_triggered?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: GeofenceType
          active?: boolean
          center?: Json | null
          radius?: number | null
          points?: Json | null
          rules?: Json
          vehicle_ids?: Json
          color?: string | null
          last_triggered?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          vehicle_id: string
          start_time: string
          end_time: string
          total_distance: number
          travel_time: number
          stopped_time: number
          average_speed: number
          max_speed: number
          stops_count: number
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          start_time: string
          end_time: string
          total_distance?: number
          travel_time?: number
          stopped_time?: number
          average_speed?: number
          max_speed?: number
          stops_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          start_time?: string
          end_time?: string
          total_distance?: number
          travel_time?: number
          stopped_time?: number
          average_speed?: number
          max_speed?: number
          stops_count?: number
          created_at?: string
        }
      }
      location_points: {
        Row: {
          id: string
          trip_id: string
          latitude: number
          longitude: number
          speed: number
          heading: number
          accuracy: number | null
          timestamp: string
        }
        Insert: {
          id?: string
          trip_id: string
          latitude: number
          longitude: number
          speed?: number
          heading?: number
          accuracy?: number | null
          timestamp: string
        }
        Update: {
          id?: string
          trip_id?: string
          latitude?: number
          longitude?: number
          speed?: number
          heading?: number
          accuracy?: number | null
          timestamp?: string
        }
      }
      route_events: {
        Row: {
          id: string
          trip_id: string
          type: RouteEventType
          latitude: number
          longitude: number
          timestamp: string
          duration: number | null
          speed: number | null
          speed_limit: number | null
          geofence_name: string | null
          address: string | null
        }
        Insert: {
          id?: string
          trip_id: string
          type: RouteEventType
          latitude: number
          longitude: number
          timestamp: string
          duration?: number | null
          speed?: number | null
          speed_limit?: number | null
          geofence_name?: string | null
          address?: string | null
        }
        Update: {
          id?: string
          trip_id?: string
          type?: RouteEventType
          latitude?: number
          longitude?: number
          timestamp?: string
          duration?: number | null
          speed?: number | null
          speed_limit?: number | null
          geofence_name?: string | null
          address?: string | null
        }
      }
      speed_violations: {
        Row: {
          id: string
          vehicle_id: string
          vehicle_name: string
          speed: number
          speed_limit: number
          excess_speed: number
          latitude: number
          longitude: number
          duration: number
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          vehicle_name: string
          speed: number
          speed_limit: number
          excess_speed: number
          latitude: number
          longitude: number
          duration?: number
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          vehicle_name?: string
          speed?: number
          speed_limit?: number
          excess_speed?: number
          latitude?: number
          longitude?: number
          duration?: number
          timestamp?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      vehicle_status: VehicleStatus
      ignition_status: IgnitionStatus
      alert_type: AlertType
      alert_priority: AlertPriority
      geofence_type: GeofenceType
      route_event_type: RouteEventType
    }
  }
}

