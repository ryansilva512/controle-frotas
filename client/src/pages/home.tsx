import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Truck, Map, History, Shield, Bell, BarChart3, 
  TrendingUp, AlertTriangle, Activity, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Vehicle, Alert } from "@shared/schema";

export default function HomePage() {
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: alerts = [], isLoading: isLoadingAlerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const movingVehicles = vehicles.filter(v => v.status === "moving").length;
  const stoppedVehicles = vehicles.filter(v => v.status === "stopped" || v.status === "idle").length;
  const offlineVehicles = vehicles.filter(v => v.status === "offline").length;
  const unreadAlerts = alerts.filter(a => !a.read).length;

  const quickLinks = [
    { 
      path: "/dashboard", 
      label: "Mapa em Tempo Real", 
      description: "Visualize todos os veículos no mapa",
      icon: Map, 
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
    },
    { 
      path: "/vehicles", 
      label: "Veículos", 
      description: "Gerencie sua frota de veículos",
      icon: Truck, 
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
    },
    { 
      path: "/history", 
      label: "Histórico", 
      description: "Consulte trajetos anteriores",
      icon: History, 
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" 
    },
    { 
      path: "/geofences", 
      label: "Geofences", 
      description: "Configure áreas monitoradas",
      icon: Shield, 
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" 
    },
    { 
      path: "/alerts", 
      label: "Alertas", 
      description: "Veja notificações do sistema",
      icon: Bell, 
      color: "bg-red-500/10 text-red-600 dark:text-red-400",
      badge: unreadAlerts > 0 ? unreadAlerts : undefined
    },
    { 
      path: "/reports", 
      label: "Relatórios", 
      description: "Análises e estatísticas",
      icon: BarChart3, 
      color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" 
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto" data-testid="home-page">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-white px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">VascoTrack</h1>
              <p className="text-zinc-400">Sistema de Controle de Frotas</p>
            </div>
          </div>
          <p className="text-lg text-zinc-300 max-w-2xl">
            Monitore sua frota em tempo real, acompanhe trajetos, receba alertas 
            e gere relatórios detalhados para uma gestão eficiente.
          </p>
        </div>
      </div>

      <div className="flex-1 p-6 bg-muted/30">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Veículos</p>
                    {isLoadingVehicles ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold font-mono">{vehicles.length}</p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Em Movimento</p>
                    {isLoadingVehicles ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                        {movingVehicles}
                      </p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Parados</p>
                    {isLoadingVehicles ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">
                        {stoppedVehicles}
                      </p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Alertas Não Lidos</p>
                    {isLoadingAlerts ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className={cn(
                        "text-3xl font-bold font-mono",
                        unreadAlerts > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                      )}>
                        {unreadAlerts}
                      </p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center relative">
                    <Bell className="h-6 w-6 text-red-600 dark:text-red-400" />
                    {unreadAlerts > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Acesso Rápido</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickLinks.map(link => (
                <Link key={link.path} href={link.path}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className={cn("p-3 rounded-lg", link.color)}>
                          <link.icon className="h-6 w-6" />
                        </div>
                        {link.badge !== undefined && link.badge > 0 && (
                          <Badge variant="destructive" className="animate-pulse">
                            {link.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{link.label}</h3>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {link.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Alerts */}
          {unreadAlerts > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Alertas Recentes
                </CardTitle>
                <CardDescription>
                  Você tem {unreadAlerts} alerta(s) não lido(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts
                    .filter(a => !a.read)
                    .slice(0, 3)
                    .map(alert => (
                      <div 
                        key={alert.id} 
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className={cn(
                          "p-2 rounded-full",
                          alert.priority === "critical" ? "bg-red-500/10 text-red-600" :
                          alert.priority === "warning" ? "bg-amber-500/10 text-amber-600" :
                          "bg-blue-500/10 text-blue-600"
                        )}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{alert.vehicleName}</p>
                          <p className="text-sm text-muted-foreground truncate">{alert.message}</p>
                        </div>
                        <Badge variant={alert.priority === "critical" ? "destructive" : "secondary"}>
                          {alert.priority === "critical" ? "Crítico" : 
                           alert.priority === "warning" ? "Aviso" : "Info"}
                        </Badge>
                      </div>
                    ))}
                </div>
                <Link href="/alerts">
                  <Button variant="outline" className="w-full mt-4 gap-2">
                    Ver todos os alertas
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
