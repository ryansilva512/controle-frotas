import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Truck, MapPin, Gauge, Clock, Activity, 
  ArrowRight, Signal, SignalZero, TrendingUp,
  Car, PauseCircle, WifiOff, Wifi
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@shared/schema";

export default function HomePage() {
  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const stats = {
    total: vehicles.length,
    connected: vehicles.filter(v => v.isConnected).length,
    moving: vehicles.filter(v => v.status === "moving").length,
    stopped: vehicles.filter(v => v.status === "stopped" || v.status === "idle").length,
    offline: vehicles.filter(v => v.status === "offline").length,
  };

  // Retorna cor do status considerando isConnected como prioridade
  const getStatusColor = (vehicle: Vehicle) => {
    if (vehicle.isConnected) return "bg-blue-500";
    switch (vehicle.status) {
      case "moving": return "bg-emerald-500";
      case "stopped": return "bg-amber-500";
      case "idle": return "bg-amber-500";
      case "offline": return "bg-zinc-400";
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
    <ScrollArea className="h-full">
      <div className="min-h-full" data-testid="home-page">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>
          
          {/* Gradient Orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
          
          <div className="relative px-6 py-16 md:py-24">
            <div className="max-w-6xl mx-auto text-center">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-white to-zinc-200 flex items-center justify-center shadow-2xl ring-4 ring-white/20">
                  <span className="text-zinc-900 font-black text-4xl">V</span>
                </div>
              </div>
              
              {/* Title */}
              <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
                Vasco<span className="text-emerald-400">Track</span>
              </h1>
              
              <p className="text-lg md:text-xl text-zinc-300 mb-8 max-w-2xl mx-auto">
                Sistema inteligente de controle e rastreamento de frotas em tempo real
              </p>
              
              {/* CTA Button */}
              <Link href="/dashboard">
                <Button size="lg" className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25">
                  <Activity className="h-5 w-5" />
                  Acessar Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-6 -mt-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-zinc-500/10 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{isLoading ? "-" : stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Wifi className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-500">{isLoading ? "-" : stats.connected}</p>
                    <p className="text-xs text-muted-foreground">Conectados</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Car className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-500">{isLoading ? "-" : stats.moving}</p>
                    <p className="text-xs text-muted-foreground">Em Movimento</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <PauseCircle className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{isLoading ? "-" : stats.stopped}</p>
                    <p className="text-xs text-muted-foreground">Parados</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-zinc-500/10 flex items-center justify-center">
                    <WifiOff className="h-6 w-6 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-500">{isLoading ? "-" : stats.offline}</p>
                    <p className="text-xs text-muted-foreground">Offline</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Vehicles Grid Section */}
        <section className="px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Frota de Veículos</h2>
                <p className="text-sm text-muted-foreground">
                  Visão geral de todos os veículos cadastrados
                </p>
              </div>
              <Link href="/vehicles">
                <Button variant="outline" className="gap-2">
                  Gerenciar Veículos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : vehicles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum veículo cadastrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicione seu primeiro veículo para começar o rastreamento
                  </p>
                  <Link href="/vehicles">
                    <Button>Adicionar Veículo</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((vehicle, index) => (
                  <Card 
                    key={vehicle.id}
                    className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Status Bar */}
                    <div className={cn("h-1", getStatusColor(vehicle))} />
                    
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{vehicle.name}</CardTitle>
                            <p className="text-sm text-muted-foreground font-mono">
                              {vehicle.licensePlate}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-[10px] text-white shrink-0", getStatusColor(vehicle))}
                        >
                          {getStatusLabel(vehicle)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* Speed */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Gauge className="h-4 w-4" />
                          <span>Velocidade</span>
                        </div>
                        <span className={cn(
                          "font-mono font-medium",
                          vehicle.currentSpeed > vehicle.speedLimit && "text-red-500"
                        )}>
                          {vehicle.currentSpeed} <span className="text-muted-foreground">/ {vehicle.speedLimit} km/h</span>
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>Localização</span>
                        </div>
                        <span className="font-mono text-xs">
                          {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
                        </span>
                      </div>

                      {/* Last Update */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {vehicle.status === "offline" ? (
                            <SignalZero className="h-4 w-4" />
                          ) : (
                            <Signal className="h-4 w-4" />
                          )}
                          <span>Última atualização</span>
                        </div>
                        <span className="text-xs">{formatTime(vehicle.lastUpdate)}</span>
                      </div>

                      {/* Direction indicator */}
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <TrendingUp 
                            className="h-4 w-4" 
                            style={{ transform: `rotate(${vehicle.heading - 45}deg)` }}
                          />
                          <span>Direção</span>
                        </div>
                        <span className="text-xs">{Math.round(vehicle.heading)}°</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 border-0">
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-8">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Acompanhe sua frota em tempo real
                  </h3>
                  <p className="text-zinc-400">
                    Visualize todos os veículos no mapa interativo com atualizações ao vivo
                  </p>
                </div>
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white whitespace-nowrap">
                    <Activity className="h-5 w-5" />
                    Abrir Mapa
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
