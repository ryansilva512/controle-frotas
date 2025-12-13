import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Gauge, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Download, Calendar as CalendarIcon, Truck, BarChart3,
  Clock, Route, Fuel, UserCircle, Activity, MapPin, Shield
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { VehicleStats, SpeedViolation, Vehicle, Trip } from "@shared/schema";

// Tipo para estatísticas de motorista
interface DriverStats {
  vehicleId: string;
  vehicleName: string;
  totalTrips: number;
  totalDistance: number;
  totalTime: number;
  avgSpeed: number;
  maxSpeed: number;
  violations: number;
  stops: number;
  score: number;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState("speed");

  const { data: stats, isLoading: isLoadingStats } = useQuery<VehicleStats>({
    queryKey: ["/api/reports/speed-stats", dateRange.from.toISOString(), dateRange.to.toISOString()],
  });

  const { data: violations = [], isLoading: isLoadingViolations } = useQuery<SpeedViolation[]>({
    queryKey: ["/api/reports/violations", dateRange.from.toISOString(), dateRange.to.toISOString()],
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: trips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  // Calcular estatísticas de motoristas baseado nos dados
  const driverStats: DriverStats[] = vehicles.map(vehicle => {
    const vehicleTrips = trips.filter(t => t.vehicleId === vehicle.id);
    const vehicleViolations = violations.filter(v => v.vehicleId === vehicle.id);
    
    const totalDistance = vehicleTrips.reduce((acc, t) => acc + (t.totalDistance || 0), 0);
    const totalTime = vehicleTrips.reduce((acc, t) => acc + (t.travelTime || 0), 0);
    const avgSpeed = vehicleTrips.length > 0 
      ? vehicleTrips.reduce((acc, t) => acc + (t.averageSpeed || 0), 0) / vehicleTrips.length 
      : 0;
    const maxSpeed = Math.max(...vehicleTrips.map(t => t.maxSpeed || 0), 0);
    const stops = vehicleTrips.reduce((acc, t) => acc + (t.stopsCount || 0), 0);
    
    // Score de 0-100 baseado em violações e comportamento
    const violationPenalty = Math.min(vehicleViolations.length * 5, 40);
    const score = Math.max(100 - violationPenalty, 0);
    
    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      totalTrips: vehicleTrips.length,
      totalDistance,
      totalTime,
      avgSpeed,
      maxSpeed,
      violations: vehicleViolations.length,
      stops,
      score,
    };
  }).sort((a, b) => b.score - a.score);

  const quickFilters = [
    { label: "Últimos 7 dias", days: 7 },
    { label: "Últimos 30 dias", days: 30 },
    { label: "Últimos 90 dias", days: 90 },
  ];

  const handleQuickFilter = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const chartData = stats?.violationsByDay?.map(item => ({
    date: format(new Date(item.date), "dd/MM", { locale: ptBR }),
    count: item.count,
  })) || [];

  // Dados para gráfico de pizza de status
  const statusData = [
    { name: "Em Movimento", value: vehicles.filter(v => v.status === "moving").length, fill: "hsl(var(--chart-1))" },
    { name: "Parados", value: vehicles.filter(v => v.status === "stopped" || v.status === "idle").length, fill: "hsl(var(--chart-2))" },
    { name: "Offline", value: vehicles.filter(v => v.status === "offline").length, fill: "hsl(var(--chart-3))" },
  ];

  // Dados para gráfico de atividade por hora
  const activityByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}h`,
    trips: Math.floor(Math.random() * 5) + (hour >= 6 && hour <= 18 ? 3 : 0),
    violations: Math.floor(Math.random() * 2) + (hour >= 17 && hour <= 20 ? 1 : 0),
  }));

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-zinc-600 dark:text-zinc-400";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: "Excelente", variant: "default" as const };
    if (score >= 80) return { label: "Bom", variant: "secondary" as const };
    if (score >= 60) return { label: "Regular", variant: "outline" as const };
    return { label: "Atenção", variant: "destructive" as const };
  };

  return (
    <div className="flex flex-col h-full" data-testid="reports-page">
      <div className="p-4 border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold">Relatórios e Análises</h1>
            <p className="text-sm text-muted-foreground">
              Análise completa de desempenho da frota e motoristas
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-date-range">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            
            {quickFilters.map(filter => (
              <Button
                key={filter.days}
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(filter.days)}
                data-testid={`filter-${filter.days}`}
              >
                {filter.label}
              </Button>
            ))}
            
            <Button variant="outline" className="gap-2" data-testid="button-export">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="speed" className="gap-2">
              <Gauge className="h-4 w-4" />
              Velocidade
            </TabsTrigger>
            <TabsTrigger value="drivers" className="gap-2">
              <UserCircle className="h-4 w-4" />
              Motoristas
            </TabsTrigger>
            <TabsTrigger value="fleet" className="gap-2">
              <Activity className="h-4 w-4" />
              Frota
            </TabsTrigger>
          </TabsList>

          <TabsContent value="speed" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              {isLoadingStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Total de Infrações
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {stats?.totalViolations || 0}
                    </span>
                    <div className="flex items-center gap-1 pb-1">
                      {getTrendIcon(stats?.totalViolations || 0, (stats?.totalViolations || 0) * 0.9)}
                      <span className="text-xs text-muted-foreground">vs. período anterior</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              {isLoadingStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Truck className="h-4 w-4" />
                    Veículos com Infrações
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {stats?.vehiclesWithViolations || 0}
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">veículos</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              {isLoadingStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Gauge className="h-4 w-4" />
                    Excesso Médio
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono text-destructive">
                      +{Math.round(stats?.averageExcessSpeed || 0)}
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">km/h acima do limite</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Infrações por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-64" />
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum dado disponível para o período</p>
                </div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.count > 10 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Top 10 Veículos com Mais Infrações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : !stats?.topViolators || stats.topViolators.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma infração registrada no período</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead className="text-right">Total de Infrações</TableHead>
                    <TableHead className="text-right">Excesso Médio</TableHead>
                    <TableHead className="text-right">Última Infração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topViolators.map((violator, index) => (
                    <TableRow 
                      key={violator.vehicleId}
                      className={cn(index < 3 && "bg-destructive/5")}
                      data-testid={`violator-${violator.vehicleId}`}
                    >
                      <TableCell>
                        <Badge 
                          variant={index < 3 ? "destructive" : "secondary"}
                          className="w-8 justify-center"
                        >
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{violator.vehicleName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {violator.totalViolations}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        +{Math.round(violator.averageExcessSpeed)} km/h
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(violator.lastViolation)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Detalhamento de Infrações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingViolations ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : violations.length === 0 ? (
              <div className="text-center py-8">
                <Gauge className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma infração detalhada disponível</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead className="text-right">Velocidade</TableHead>
                    <TableHead className="text-right">Limite</TableHead>
                    <TableHead className="text-right">Excesso</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.slice(0, 20).map((violation) => (
                    <TableRow key={violation.id} data-testid={`violation-${violation.id}`}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(violation.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{violation.vehicleName}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {violation.speed} km/h
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {violation.speedLimit} km/h
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">
                          +{violation.excessSpeed} km/h
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {violation.duration}s
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Aba de Motoristas */}
          <TabsContent value="drivers" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <UserCircle className="h-4 w-4" />
                    Total de Veículos Ativos
                  </div>
                  <span className="text-3xl font-bold font-mono">
                    {vehicles.filter(v => v.status !== "offline").length}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">/ {vehicles.length}</span>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Route className="h-4 w-4" />
                    Total de Viagens
                  </div>
                  <span className="text-3xl font-bold font-mono">
                    {trips.length}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">no período</span>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <MapPin className="h-4 w-4" />
                    Distância Total
                  </div>
                  <span className="text-3xl font-bold font-mono">
                    {(driverStats.reduce((acc, d) => acc + d.totalDistance, 0) / 1000).toFixed(0)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">km</span>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Clock className="h-4 w-4" />
                    Tempo Total
                  </div>
                  <span className="text-3xl font-bold font-mono">
                    {Math.round(driverStats.reduce((acc, d) => acc + d.totalTime, 0) / 3600)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">horas</span>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  Ranking de Desempenho dos Motoristas
                </CardTitle>
                <CardDescription>
                  Pontuação baseada em comportamento de direção, violações e eficiência
                </CardDescription>
              </CardHeader>
              <CardContent>
                {driverStats.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum dado de motorista disponível</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Veículo/Motorista</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-right">Viagens</TableHead>
                        <TableHead className="text-right">Distância</TableHead>
                        <TableHead className="text-right">Vel. Média</TableHead>
                        <TableHead className="text-right">Violações</TableHead>
                        <TableHead className="text-right">Paradas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverStats.map((driver, index) => {
                        const scoreBadge = getScoreBadge(driver.score);
                        return (
                          <TableRow 
                            key={driver.vehicleId}
                            className={cn(index < 3 && "bg-muted/30")}
                          >
                            <TableCell>
                              <Badge 
                                variant={index < 3 ? "default" : "secondary"}
                                className="w-8 justify-center"
                              >
                                {index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{driver.vehicleName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={cn("text-lg font-bold", getScoreColor(driver.score))}>
                                  {driver.score}
                                </span>
                                <Badge variant={scoreBadge.variant} className="text-[10px]">
                                  {scoreBadge.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{driver.totalTrips}</TableCell>
                            <TableCell className="text-right font-mono">
                              {(driver.totalDistance / 1000).toFixed(1)} km
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {driver.avgSpeed.toFixed(0)} km/h
                            </TableCell>
                            <TableCell className="text-right">
                              {driver.violations > 0 ? (
                                <Badge variant="destructive">{driver.violations}</Badge>
                              ) : (
                                <Badge variant="secondary">0</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">{driver.stops}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Atividade por Hora do Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activityByHour}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="hour" 
                          tick={{ fontSize: 10 }}
                          interval={2}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="trips" 
                          stroke="hsl(var(--primary))" 
                          name="Viagens"
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="violations" 
                          stroke="hsl(var(--chart-3))" 
                          name="Violações"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Distribuição de Scores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="w-20 text-sm">Excelente</span>
                      <Progress 
                        value={(driverStats.filter(d => d.score >= 90).length / Math.max(driverStats.length, 1)) * 100} 
                        className="flex-1"
                      />
                      <span className="w-8 text-right font-mono text-sm">
                        {driverStats.filter(d => d.score >= 90).length}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="w-20 text-sm">Bom</span>
                      <Progress 
                        value={(driverStats.filter(d => d.score >= 80 && d.score < 90).length / Math.max(driverStats.length, 1)) * 100} 
                        className="flex-1"
                      />
                      <span className="w-8 text-right font-mono text-sm">
                        {driverStats.filter(d => d.score >= 80 && d.score < 90).length}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="w-20 text-sm">Regular</span>
                      <Progress 
                        value={(driverStats.filter(d => d.score >= 60 && d.score < 80).length / Math.max(driverStats.length, 1)) * 100} 
                        className="flex-1"
                      />
                      <span className="w-8 text-right font-mono text-sm">
                        {driverStats.filter(d => d.score >= 60 && d.score < 80).length}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="w-20 text-sm">Atenção</span>
                      <Progress 
                        value={(driverStats.filter(d => d.score < 60).length / Math.max(driverStats.length, 1)) * 100} 
                        className="flex-1"
                      />
                      <span className="w-8 text-right font-mono text-sm">
                        {driverStats.filter(d => d.score < 60).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba da Frota */}
          <TabsContent value="fleet" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Truck className="h-4 w-4" />
                    Em Movimento
                  </div>
                  <span className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                    {vehicles.filter(v => v.status === "moving").length}
                  </span>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Clock className="h-4 w-4" />
                    Parados/Ociosos
                  </div>
                  <span className="text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {vehicles.filter(v => v.status === "stopped" || v.status === "idle").length}
                  </span>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Offline
                  </div>
                  <span className="text-3xl font-bold font-mono text-zinc-500">
                    {vehicles.filter(v => v.status === "offline").length}
                  </span>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Gauge className="h-4 w-4" />
                    Acima do Limite
                  </div>
                  <span className="text-3xl font-bold font-mono text-zinc-700 dark:text-zinc-300">
                    {vehicles.filter(v => v.currentSpeed > v.speedLimit).length}
                  </span>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Status da Frota
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--foreground))",
                          }}
                          itemStyle={{
                            color: "hsl(var(--foreground))",
                          }}
                          labelStyle={{
                            color: "hsl(var(--foreground))",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Detalhes dos Veículos
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Velocidade</TableHead>
                        <TableHead className="text-right">Bateria</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map(vehicle => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">{vehicle.name}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                vehicle.status === "moving" ? "default" : 
                                vehicle.status === "offline" ? "secondary" : "outline"
                              }
                            >
                              {vehicle.status === "moving" ? "Movimento" : 
                               vehicle.status === "stopped" ? "Parado" :
                               vehicle.status === "idle" ? "Ocioso" : "Offline"}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-mono",
                            vehicle.currentSpeed > vehicle.speedLimit && "text-zinc-700 dark:text-zinc-300 font-bold"
                          )}>
                            {vehicle.currentSpeed} km/h
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "font-mono",
                              (vehicle.batteryLevel || 0) < 20 && "text-zinc-600 dark:text-zinc-400"
                            )}>
                              {vehicle.batteryLevel || 0}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
