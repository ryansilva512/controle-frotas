import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Truck, Plus, Search, Filter, MapPin, Gauge, 
  Battery, Signal, MoreVertical, History, Edit2, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Vehicle } from "@shared/schema";

type FilterStatus = "all" | "moving" | "stopped" | "idle" | "offline";

export default function VehiclesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Veículo removido", description: "O veículo foi removido com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível remover o veículo.", variant: "destructive" });
    },
  });

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Vehicle["status"]) => {
    switch (status) {
      case "moving":
        return <Badge variant="default" className="bg-green-600">Em movimento</Badge>;
      case "stopped":
        return <Badge variant="secondary">Parado</Badge>;
      case "idle":
        return <Badge variant="outline">Ocioso</Badge>;
      case "offline":
        return <Badge variant="destructive">Offline</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusColor = (status: Vehicle["status"]) => {
    switch (status) {
      case "moving": return "border-l-green-500";
      case "stopped": return "border-l-amber-500";
      case "idle": return "border-l-blue-500";
      case "offline": return "border-l-zinc-400";
      default: return "border-l-zinc-400";
    }
  };

  const handleViewOnMap = (vehicle: Vehicle) => {
    navigate(`/dashboard?vehicleId=${vehicle.id}`);
  };

  const handleViewHistory = (vehicle: Vehicle) => {
    navigate(`/history?vehicleId=${vehicle.id}`);
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    if (confirm(`Tem certeza que deseja remover o veículo "${vehicle.name}"?`)) {
      deleteMutation.mutate(vehicle.id);
    }
  };

  const statusCounts = {
    all: vehicles.length,
    moving: vehicles.filter(v => v.status === "moving").length,
    stopped: vehicles.filter(v => v.status === "stopped").length,
    idle: vehicles.filter(v => v.status === "idle").length,
    offline: vehicles.filter(v => v.status === "offline").length,
  };

  return (
    <div className="flex flex-col h-full" data-testid="vehicles-page">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Veículos
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie sua frota de veículos
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar veículo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
                data-testid="search-input"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FilterStatus)}>
              <SelectTrigger className="w-[150px]" data-testid="status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({statusCounts.all})</SelectItem>
                <SelectItem value="moving">Em movimento ({statusCounts.moving})</SelectItem>
                <SelectItem value="stopped">Parados ({statusCounts.stopped})</SelectItem>
                <SelectItem value="idle">Ociosos ({statusCounts.idle})</SelectItem>
                <SelectItem value="offline">Offline ({statusCounts.offline})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex flex-wrap gap-4">
          {[
            { key: "moving" as const, label: "Em Movimento", color: "bg-green-500" },
            { key: "stopped" as const, label: "Parados", color: "bg-amber-500" },
            { key: "idle" as const, label: "Ociosos", color: "bg-blue-500" },
            { key: "offline" as const, label: "Offline", color: "bg-zinc-400" },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(statusFilter === item.key ? "all" : item.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                statusFilter === item.key 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card hover:bg-muted"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", item.color)} />
              <span>{item.label}</span>
              <span className="font-mono font-bold">{statusCounts[item.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-16">
              <Truck className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || statusFilter !== "all" 
                  ? "Nenhum veículo encontrado" 
                  : "Nenhum veículo cadastrado"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Adicione veículos para começar a monitorar sua frota"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map(vehicle => (
                <Card 
                  key={vehicle.id} 
                  className={cn(
                    "border-l-4 hover:shadow-lg transition-all cursor-pointer",
                    getStatusColor(vehicle.status)
                  )}
                  data-testid={`vehicle-${vehicle.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{vehicle.name}</h3>
                          <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewOnMap(vehicle)}>
                            <MapPin className="h-4 w-4 mr-2" />
                            Ver no mapa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewHistory(vehicle)}>
                            <History className="h-4 w-4 mr-2" />
                            Ver histórico
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteVehicle(vehicle)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mb-3">
                      {getStatusBadge(vehicle.status)}
                      {vehicle.model && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {vehicle.model}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Gauge className="h-4 w-4" />
                        <span className="font-mono">{vehicle.currentSpeed} km/h</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Battery className={cn(
                          "h-4 w-4",
                          (vehicle.batteryLevel || 0) < 20 && "text-red-500"
                        )} />
                        <span className="font-mono">{vehicle.batteryLevel || 0}%</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate text-xs">
                          {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => handleViewOnMap(vehicle)}
                      >
                        <MapPin className="h-3 w-3" />
                        Mapa
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => handleViewHistory(vehicle)}
                      >
                        <History className="h-3 w-3" />
                        Histórico
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
  );
}
