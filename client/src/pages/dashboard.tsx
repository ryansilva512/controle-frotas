import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { VehicleList } from "@/components/vehicle-list";
import { VehicleDetailPanel } from "@/components/vehicle-detail-panel";
import { FleetMap } from "@/components/fleet-map";
import { useAlertsRealtime, useVehicleUpdates } from "@/hooks/use-websocket";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vehicle, Alert, Geofence } from "@shared/schema";

type MapFilterType = "all" | "moving" | "stopped" | "offline";

export default function Dashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();
  const [followVehicle, setFollowVehicle] = useState<Vehicle | undefined>();
  const [recentTrail, setRecentTrail] = useState<{ latitude: number; longitude: number }[]>([]);
  const [mapFilter, setMapFilter] = useState<MapFilterType>("all");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Usa Supabase Realtime se configurado, senão WebSocket
  useVehicleUpdates();
  useAlertsRealtime();

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: geofences = [] } = useQuery<Geofence[]>({
    queryKey: ["/api/geofences"],
  });

  // Filtrar veículos para o mapa
  const filteredVehiclesForMap = useMemo(() => {
    let filtered = vehicles;
    
    // Filtrar por status
    if (mapFilter !== "all") {
      filtered = filtered.filter(v => {
        switch (mapFilter) {
          case "moving": return v.status === "moving";
          case "stopped": return v.status === "stopped" || v.status === "idle";
          case "offline": return v.status === "offline";
          default: return true;
        }
      });
    }
    
    // Filtrar por veículos selecionados
    if (showOnlySelected && selectedVehicleIds.length > 0) {
      filtered = filtered.filter(v => selectedVehicleIds.includes(v.id));
    }
    
    return filtered;
  }, [vehicles, mapFilter, showOnlySelected, selectedVehicleIds]);

  // Adicionar/remover veículo da seleção
  const toggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicleIds(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  // Limpar filtros
  const clearFilters = () => {
    setMapFilter("all");
    setSelectedVehicleIds([]);
    setShowOnlySelected(false);
  };

  useEffect(() => {
    if (selectedVehicle && vehicles.length > 0) {
      const updatedVehicle = vehicles.find(v => v.id === selectedVehicle.id);
      if (updatedVehicle) {
        setSelectedVehicle(updatedVehicle);
        
        setRecentTrail(prev => {
          const newTrail = [...prev, { latitude: updatedVehicle.latitude, longitude: updatedVehicle.longitude }];
          return newTrail.slice(-20);
        });

        if (followVehicle?.id === selectedVehicle.id) {
          setFollowVehicle(updatedVehicle);
        }
      }
    }
  }, [vehicles, selectedVehicle?.id, followVehicle?.id]);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFollowVehicle(undefined);
    setRecentTrail([{ latitude: vehicle.latitude, longitude: vehicle.longitude }]);
  };

  const handleCloseDetail = () => {
    setSelectedVehicle(undefined);
    setFollowVehicle(undefined);
    setRecentTrail([]);
  };

  const handleFollowVehicle = () => {
    if (followVehicle?.id === selectedVehicle?.id) {
      setFollowVehicle(undefined);
    } else {
      setFollowVehicle(selectedVehicle);
    }
  };

  return (
    <div className="flex h-full" data-testid="dashboard-page">
      <div className="w-80 flex-shrink-0 border-r border-sidebar-border bg-sidebar">
        <VehicleList
          vehicles={vehicles}
          selectedVehicleId={selectedVehicle?.id}
          onSelectVehicle={handleSelectVehicle}
          isLoading={isLoadingVehicles}
        />
      </div>
      
      <div className="flex-1 relative">
        {/* Controles de Filtro do Mapa */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
          <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros do Mapa</span>
              {(mapFilter !== "all" || selectedVehicleIds.length > 0) && (
                <Button variant="ghost" size="sm" className="h-6 px-2 ml-auto" onClick={clearFilters}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {/* Filtro por Status */}
            <div className="flex flex-wrap gap-1 mb-3">
              {[
                { key: "all" as MapFilterType, label: "Todos" },
                { key: "moving" as MapFilterType, label: "Movimento" },
                { key: "stopped" as MapFilterType, label: "Parados" },
                { key: "offline" as MapFilterType, label: "Offline" },
              ].map(filter => (
                <Button
                  key={filter.key}
                  variant={mapFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setMapFilter(filter.key)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            
            {/* Seletor de Veículo Específico */}
            <div className="space-y-2">
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !selectedVehicleIds.includes(value)) {
                    setSelectedVehicleIds(prev => [...prev, value]);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Adicionar veículo ao filtro..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles
                    .filter(v => !selectedVehicleIds.includes(v.id))
                    .map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} - {vehicle.licensePlate}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              
              {/* Veículos selecionados */}
              {selectedVehicleIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedVehicleIds.map(id => {
                    const vehicle = vehicles.find(v => v.id === id);
                    return vehicle ? (
                      <Badge 
                        key={id} 
                        variant="secondary" 
                        className="text-[10px] cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => toggleVehicleSelection(id)}
                      >
                        {vehicle.name}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
              
              {/* Toggle para mostrar apenas selecionados */}
              {selectedVehicleIds.length > 0 && (
                <Button
                  variant={showOnlySelected ? "default" : "outline"}
                  size="sm"
                  className="w-full h-7 text-xs gap-1"
                  onClick={() => setShowOnlySelected(!showOnlySelected)}
                >
                  {showOnlySelected ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {showOnlySelected ? "Mostrando selecionados" : "Mostrar apenas selecionados"}
                </Button>
              )}
            </div>
            
            {/* Contador */}
            <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
              Exibindo {filteredVehiclesForMap.length} de {vehicles.length} veículos
            </div>
          </div>
        </div>

        <FleetMap
          vehicles={filteredVehiclesForMap}
          geofences={geofences}
          selectedVehicle={selectedVehicle}
          followVehicle={followVehicle}
          recentTrail={recentTrail}
          onSelectVehicle={handleSelectVehicle}
        />
      </div>
      
      {selectedVehicle && (
        <div className="w-[360px] flex-shrink-0 border-l border-sidebar-border">
          <VehicleDetailPanel
            vehicle={selectedVehicle}
            alerts={alerts}
            onClose={handleCloseDetail}
            onFollowVehicle={handleFollowVehicle}
            isFollowing={followVehicle?.id === selectedVehicle.id}
          />
        </div>
      )}
    </div>
  );
}
