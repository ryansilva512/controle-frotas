import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  X, MapPin, Gauge, Navigation, Radio, Battery, Clock, 
  History, Shield, AlertTriangle, Bell, Activity, Settings,
  Smartphone, Copy, RefreshCw, Eye, EyeOff, QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Vehicle, Alert } from "@shared/schema";
import { Link } from "wouter";

interface VehicleCredentials {
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  accessCode: string;
  pin: string;
  lastLogin: string | null;
}

interface VehicleDetailPanelProps {
  vehicle: Vehicle;
  alerts: Alert[];
  onClose: () => void;
  onFollowVehicle: () => void;
  isFollowing: boolean;
}

export function VehicleDetailPanel({ vehicle, alerts, onClose, onFollowVehicle, isFollowing }: VehicleDetailPanelProps) {
  const { toast } = useToast();
  const [showPin, setShowPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  
  const vehicleAlerts = alerts.filter(a => a.vehicleId === vehicle.id);
  const unreadAlerts = vehicleAlerts.filter(a => !a.read);

  // Buscar credenciais do veículo
  const { data: credentials, isLoading: isLoadingCredentials, refetch: refetchCredentials } = useQuery<VehicleCredentials>({
    queryKey: [`/api/vehicles/${vehicle.id}/credentials`],
  });

  // Mutation para atualizar PIN
  const updatePinMutation = useMutation({
    mutationFn: async (pin: string) => {
      return apiRequest("PATCH", `/api/vehicles/${vehicle.id}/credentials`, { pin });
    },
    onSuccess: () => {
      toast({ title: "PIN atualizado com sucesso!" });
      refetchCredentials();
      setNewPin("");
    },
    onError: () => {
      toast({ title: "Erro ao atualizar PIN", variant: "destructive" });
    },
  });

  // Mutation para regenerar código
  const regenerateCodeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/vehicles/${vehicle.id}/regenerate-code`);
    },
    onSuccess: () => {
      toast({ title: "Código de acesso regenerado!" });
      refetchCredentials();
    },
    onError: () => {
      toast({ title: "Erro ao regenerar código", variant: "destructive" });
    },
  });

  // Copiar para clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
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

  const getStatusColor = (status: Vehicle["status"]) => {
    switch (status) {
      case "moving": return "text-status-online";
      case "stopped": return "text-status-away";
      case "idle": return "text-status-away";
      case "offline": return "text-status-offline";
    }
  };

  const getStatusLabel = (status: Vehicle["status"]) => {
    switch (status) {
      case "moving": return "Em Movimento";
      case "stopped": return "Parado";
      case "idle": return "Ocioso";
      case "offline": return "Offline";
    }
  };

  const getIgnitionLabel = (ignition: Vehicle["ignition"]) => {
    return ignition === "on" ? "Ligada" : "Desligada";
  };

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "speed": return <Gauge className="h-4 w-4" />;
      case "geofence_entry":
      case "geofence_exit":
      case "geofence_dwell": return <Shield className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertColor = (priority: Alert["priority"]) => {
    switch (priority) {
      case "critical": return "text-destructive";
      case "warning": return "text-amber-500";
      default: return "text-primary";
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div>
          <h2 className="font-semibold text-lg">{vehicle.name}</h2>
          <p className="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-detail">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Tabs defaultValue="details" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid w-auto grid-cols-4">
          <TabsTrigger value="details" data-testid="tab-details">Detalhes</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts" className="relative">
            Alertas
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                {unreadAlerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Atividade</TabsTrigger>
          <TabsTrigger value="mobile" data-testid="tab-mobile">
            <Smartphone className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex-1 mt-0 p-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> Velocidade
                  </div>
                  <div className={cn(
                    "text-2xl font-mono font-bold",
                    vehicle.currentSpeed > vehicle.speedLimit && "text-destructive"
                  )}>
                    {vehicle.currentSpeed} <span className="text-sm font-normal">km/h</span>
                  </div>
                  {vehicle.currentSpeed > vehicle.speedLimit && (
                    <div className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Limite: {vehicle.speedLimit} km/h
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Navigation className="h-3 w-3" /> Direção
                  </div>
                  <div className="text-2xl font-mono font-bold">
                    {vehicle.heading}°
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Precisão GPS
                  </div>
                  <div className="text-lg font-mono">
                    ±{vehicle.accuracy}m
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Radio className="h-3 w-3" /> Ignição
                  </div>
                  <div className="text-lg">
                    <Badge variant={vehicle.ignition === "on" ? "default" : "secondary"}>
                      {getIgnitionLabel(vehicle.ignition)}
                    </Badge>
                  </div>
                </div>
                
                {vehicle.batteryLevel !== undefined && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Battery className="h-3 w-3" /> Bateria
                    </div>
                    <div className="text-lg font-mono">
                      {vehicle.batteryLevel}%
                    </div>
                  </div>
                )}
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Status
                  </div>
                  <div className={cn("text-lg font-medium", getStatusColor(vehicle.status))}>
                    {getStatusLabel(vehicle.status)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Última atualização: {formatTime(vehicle.lastUpdate)}
          </div>

          <Separator />

          <div className="space-y-2">
            <Button
              onClick={onFollowVehicle}
              variant={isFollowing ? "default" : "outline"}
              className="w-full justify-start gap-2"
              data-testid="button-follow-vehicle"
            >
              <Navigation className="h-4 w-4" />
              {isFollowing ? "Seguindo veículo" : "Seguir veículo"}
            </Button>
            
            <Link href={`/history?vehicleId=${vehicle.id}`}>
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-view-history">
                <History className="h-4 w-4" />
                Ver histórico
              </Button>
            </Link>
            
            <Link href={`/geofences?vehicleId=${vehicle.id}`}>
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-create-geofence">
                <Shield className="h-4 w-4" />
                Criar geofence
              </Button>
            </Link>
            
            <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-set-speed-limit">
              <Settings className="h-4 w-4" />
              Definir limite de velocidade
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {vehicleAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum alerta para este veículo</p>
                </div>
              ) : (
                vehicleAlerts.map(alert => (
                  <Card key={alert.id} className={cn(!alert.read && "border-l-2 border-l-primary")}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5", getAlertColor(alert.priority))}>
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(alert.timestamp)}
                          </p>
                        </div>
                        {!alert.read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="activity" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <div className="text-sm text-muted-foreground">Últimas 5 atividades</div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-status-online" />
                  <div className="flex-1">
                    <p className="text-sm">Iniciou movimento</p>
                    <p className="text-xs text-muted-foreground">Há 5 minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-status-away" />
                  <div className="flex-1">
                    <p className="text-sm">Parou por 12 minutos</p>
                    <p className="text-xs text-muted-foreground">Há 17 minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-status-online" />
                  <div className="flex-1">
                    <p className="text-sm">Entrou em área "Depósito"</p>
                    <p className="text-xs text-muted-foreground">Há 30 minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <div className="flex-1">
                    <p className="text-sm">Excesso de velocidade: 85 km/h</p>
                    <p className="text-xs text-muted-foreground">Há 45 minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-status-online" />
                  <div className="flex-1">
                    <p className="text-sm">Ignição ligada</p>
                    <p className="text-xs text-muted-foreground">Há 1 hora</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Aba de Acesso Mobile */}
        <TabsContent value="mobile" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Acesso Mobile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingCredentials ? (
                    <div className="text-sm text-muted-foreground">Carregando...</div>
                  ) : credentials ? (
                    <>
                      {/* Código de Acesso */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Código de Acesso</Label>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-lg tracking-widest text-center">
                            {credentials.accessCode}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(credentials.accessCode, "Código")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => regenerateCodeMutation.mutate()}
                            disabled={regenerateCodeMutation.isPending}
                          >
                            <RefreshCw className={cn("h-4 w-4", regenerateCodeMutation.isPending && "animate-spin")} />
                          </Button>
                        </div>
                      </div>

                      {/* PIN */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">PIN</Label>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-muted rounded-md px-3 py-2 font-mono text-lg text-center flex items-center justify-center gap-2">
                            {showPin ? credentials.pin : "••••"}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setShowPin(!showPin)}
                            >
                              {showPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(credentials.pin, "PIN")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Alterar PIN */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Alterar PIN</Label>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            placeholder="Novo PIN (mín. 4 dígitos)"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            onClick={() => updatePinMutation.mutate(newPin)}
                            disabled={newPin.length < 4 || updatePinMutation.isPending}
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>

                      {/* Último Login */}
                      {credentials.lastLogin && (
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Último acesso: {new Date(credentials.lastLogin).toLocaleString("pt-BR")}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Credenciais não disponíveis</div>
                  )}
                </CardContent>
              </Card>

              {/* Instruções */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Como usar no celular</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>1. Abra o app de rastreamento no celular</p>
                  <p>2. Digite o <strong>Código de Acesso</strong> e o <strong>PIN</strong></p>
                  <p>3. O app enviará a localização automaticamente</p>
                  <Separator className="my-3" />
                  <p className="text-[10px]">
                    <strong>API Endpoint:</strong><br/>
                    POST /api/vehicle-auth/login<br/>
                    POST /api/vehicle-auth/send-location
                  </p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
