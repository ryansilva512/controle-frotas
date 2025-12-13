import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, Trash2, Edit2, Truck, Gauge, MapPin, 
  Search, Signal, SignalZero, AlertTriangle
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Vehicle } from "@shared/schema";
import "leaflet/dist/leaflet.css";

type FilterType = "all" | "moving" | "stopped" | "offline";
type LatLng = { latitude: number; longitude: number };

interface VehicleFormData {
  name: string;
  licensePlate: string;
  model: string;
  latitude: number;
  longitude: number;
  speedLimit: number;
}

const defaultFormData: VehicleFormData = {
  name: "",
  licensePlate: "",
  model: "",
  latitude: -3.1190,
  longitude: -60.0217,
  speedLimit: 60,
};

const vehicleIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;background:#2563eb;border:2px solid white;border-radius:9999px;box-shadow:0 0 0 2px rgba(37,99,235,0.35);"></div>',
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function LocationClickHandler({ onSelect }: { onSelect: (value: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onSelect({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

function LocationPicker({
  value,
  onChange,
  title = "Localização",
  helper,
}: {
  value: LatLng;
  onChange: (value: LatLng) => void;
  title?: string;
  helper?: string;
}) {
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (map) {
      map.setView([value.latitude, value.longitude]);
    }
  }, [value.latitude, value.longitude, map]);

  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="h-64 rounded-md overflow-hidden border">
        <MapContainer
          center={[value.latitude, value.longitude]}
          zoom={13}
          className="h-full w-full"
          zoomControl={true}
          whenCreated={setMap}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[value.latitude, value.longitude]} icon={vehicleIcon} />
          <LocationClickHandler onSelect={onChange} />
        </MapContainer>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{helper ?? "Clique no mapa para definir a posição do veículo."}</span>
        <span className="font-mono">
          {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [formData, setFormData] = useState<VehicleFormData>(defaultFormData);

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      return apiRequest("POST", "/api/vehicles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Veículo criado", description: "O novo veículo foi adicionado com sucesso." });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível criar o veículo.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleFormData> }) => {
      return apiRequest("PATCH", `/api/vehicles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Veículo atualizado", description: "As alterações foram salvas com sucesso." });
      setEditingVehicle(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar o veículo.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Veículo excluído", description: "O veículo foi removido com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir o veículo.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData(defaultFormData);
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setFormData({
      name: vehicle.name,
      licensePlate: vehicle.licensePlate,
      model: vehicle.model || "",
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      speedLimit: vehicle.speedLimit,
    });
    setEditingVehicle(vehicle);
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Erro", description: "Digite o nome do veículo.", variant: "destructive" });
      return;
    }
    if (!formData.licensePlate.trim()) {
      toast({ title: "Erro", description: "Digite a placa do veículo.", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingVehicle) return;
    if (!formData.name.trim()) {
      toast({ title: "Erro", description: "Digite o nome do veículo.", variant: "destructive" });
      return;
    }
    if (!formData.licensePlate.trim()) {
      toast({ title: "Erro", description: "Digite a placa do veículo.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: editingVehicle.id, data: formData });
  };

  const handleDelete = (vehicle: Vehicle) => {
    if (confirm(`Tem certeza que deseja excluir o veículo "${vehicle.name}"?`)) {
      deleteMutation.mutate(vehicle.id);
    }
  };

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: vehicles.length },
    { key: "moving", label: "Em Movimento", count: vehicles.filter(v => v.status === "moving").length },
    { key: "stopped", label: "Parados", count: vehicles.filter(v => v.status === "stopped" || v.status === "idle").length },
    { key: "offline", label: "Offline", count: vehicles.filter(v => v.status === "offline").length },
  ];

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (activeFilter) {
      case "moving":
        return vehicle.status === "moving";
      case "stopped":
        return vehicle.status === "stopped" || vehicle.status === "idle";
      case "offline":
        return vehicle.status === "offline";
      default:
        return true;
    }
  });

  // Retorna cor do status considerando isConnected como prioridade (azul)
  const getStatusColor = (vehicle: Vehicle) => {
    if (vehicle.isConnected) return "bg-blue-500";
    switch (vehicle.status) {
      case "moving": return "bg-green-500";
      case "stopped": return "bg-amber-500";
      case "idle": return "bg-amber-500";
      case "offline": return "bg-gray-400";
    }
  };

  // Retorna label do status considerando isConnected como prioridade
  const getStatusLabel = (vehicle: Vehicle) => {
    if (vehicle.isConnected) return "Conectado";
    switch (vehicle.status) {
      case "moving": return "Em Movimento";
      case "stopped": return "Parado";
      case "idle": return "Ocioso";
      case "offline": return "Offline";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s atrás`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}min atrás`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="flex h-full" data-testid="vehicles-page">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Veículos</h1>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2" data-testid="button-create-vehicle">
              <Plus className="h-4 w-4" />
              Adicionar Veículo
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou placa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-vehicle"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {filters.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                    activeFilter === filter.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  data-testid={`filter-${filter.key}`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle List */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum veículo encontrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || activeFilter !== "all" 
                    ? "Tente ajustar os filtros de busca" 
                    : "Adicione seu primeiro veículo para começar"}
                </p>
                {!searchQuery && activeFilter === "all" && (
                  <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Veículo
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredVehicles.map(vehicle => (
                  <Card
                    key={vehicle.id}
                    className="hover:shadow-md transition-shadow"
                    data-testid={`vehicle-card-${vehicle.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{vehicle.name}</h3>
                              {vehicle.currentSpeed > vehicle.speedLimit && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-[10px] text-white", getStatusColor(vehicle))}
                        >
                          {getStatusLabel(vehicle)}
                        </Badge>
                      </div>
                      
                      {vehicle.model && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Modelo: {vehicle.model}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Gauge className="h-3.5 w-3.5" />
                          <span className={cn(
                            "font-mono",
                            vehicle.currentSpeed > vehicle.speedLimit && "text-destructive font-medium"
                          )}>
                            {vehicle.currentSpeed} / {vehicle.speedLimit} km/h
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {vehicle.status === "offline" ? (
                            <SignalZero className="h-3.5 w-3.5" />
                          ) : (
                            <Signal className="h-3.5 w-3.5" />
                          )}
                          <span>{formatTime(vehicle.lastUpdate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="font-mono text-[11px]">
                            {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-3 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-8"
                          onClick={() => openEditDialog(vehicle)}
                          data-testid={`edit-vehicle-${vehicle.id}`}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(vehicle)}
                          data-testid={`delete-vehicle-${vehicle.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Dialog de Criação */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Veículo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Caminhão 01"
                data-testid="input-vehicle-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="licensePlate">Placa *</Label>
              <Input
                id="licensePlate"
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                placeholder="Ex: ABC-1234"
                data-testid="input-vehicle-plate"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ex: Mercedes-Benz Actros"
                data-testid="input-vehicle-model"
              />
            </div>
            
            <LocationPicker
              value={{ latitude: formData.latitude, longitude: formData.longitude }}
              onChange={(coords) => setFormData({ ...formData, ...coords })}
              helper="Clique no mapa para definir a posição inicial."
            />
            
            <div className="space-y-2">
              <Label htmlFor="speedLimit">Limite de Velocidade (km/h)</Label>
              <Input
                id="speedLimit"
                type="number"
                min={0}
                max={200}
                value={formData.speedLimit}
                onChange={(e) => setFormData({ ...formData, speedLimit: parseInt(e.target.value) || 60 })}
                data-testid="input-vehicle-speed-limit"
              />
              <div className="flex gap-2 mt-2">
                {[30, 50, 60, 80, 100].map(speed => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setFormData({ ...formData, speedLimit: speed })}
                    className={cn(
                      "px-2 py-1 text-xs rounded-md transition-colors",
                      formData.speedLimit === speed
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-save-vehicle">
              {createMutation.isPending ? "Salvando..." : "Adicionar Veículo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={!!editingVehicle} onOpenChange={(open) => { if (!open) { setEditingVehicle(null); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Veículo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Caminhão 01"
                data-testid="input-edit-vehicle-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-licensePlate">Placa *</Label>
              <Input
                id="edit-licensePlate"
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                placeholder="Ex: ABC-1234"
                data-testid="input-edit-vehicle-plate"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-model">Modelo</Label>
              <Input
                id="edit-model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ex: Mercedes-Benz Actros"
                data-testid="input-edit-vehicle-model"
              />
            </div>
            
            <LocationPicker
              value={{ latitude: formData.latitude, longitude: formData.longitude }}
              onChange={(coords) => setFormData({ ...formData, ...coords })}
              title="Localização"
              helper="Clique no mapa para alterar a posição do veículo."
            />
            
            <div className="space-y-2">
              <Label htmlFor="edit-speedLimit">Limite de Velocidade (km/h)</Label>
              <Input
                id="edit-speedLimit"
                type="number"
                min={0}
                max={200}
                value={formData.speedLimit}
                onChange={(e) => setFormData({ ...formData, speedLimit: parseInt(e.target.value) || 60 })}
                data-testid="input-edit-vehicle-speed-limit"
              />
              <div className="flex gap-2 mt-2">
                {[30, 50, 60, 80, 100].map(speed => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setFormData({ ...formData, speedLimit: speed })}
                    className={cn(
                      "px-2 py-1 text-xs rounded-md transition-colors",
                      formData.speedLimit === speed
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingVehicle(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-update-vehicle">
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

