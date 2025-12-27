import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Map, History, Shield, Bell, BarChart3, Truck, Home
} from "lucide-react";
import { cn } from "@/lib/utils";

import HomePage from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import HistoryPage from "@/pages/history";
import GeofencesPage from "@/pages/geofences";
import AlertsPage from "@/pages/alerts";
import ReportsPage from "@/pages/reports";
import VehiclesPage from "@/pages/vehicles";
import NotFound from "@/pages/not-found";

import type { Alert } from "@shared/schema";

function Navigation() {
  const [location] = useLocation();

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const unreadAlerts = alerts.filter(a => !a.read).length;

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/dashboard", label: "Mapa", icon: Map },
    { path: "/vehicles", label: "Veículos", icon: Truck },
    { path: "/history", label: "Histórico", icon: History },
    { path: "/geofences", label: "Geofences", icon: Shield },
    { path: "/alerts", label: "Alertas", icon: Bell, badge: unreadAlerts > 0 ? unreadAlerts : undefined },
    { path: "/reports", label: "Relatórios", icon: BarChart3 },
  ];

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-6 sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform ring-2 ring-zinc-300 dark:ring-zinc-700">
          <span className="text-white dark:text-zinc-900 font-black text-lg">V</span>
        </div>
        <div className="hidden md:flex flex-col -space-y-1">
          <span className="font-bold text-lg tracking-tight">VascoTrack</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Controle de Frotas</span>
        </div>
      </Link>
      
      <nav className="flex items-center gap-1 flex-1">
        {navItems.map(item => {
          const isActive = location === item.path || 
            (item.path !== "/" && location.startsWith(item.path));
          
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "gap-2 relative",
                  isActive && "font-medium"
                )}
                data-testid={`nav-${item.path.replace("/", "") || "home"}`}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-primary opacity-75"></span>
                    <Badge 
                      variant="default" 
                      className="relative h-5 min-w-5 px-1 text-[10px] animate-pulse"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  </span>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}

function ProtectedRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/vehicles" component={VehiclesPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/geofences" component={GeofencesPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="flex flex-col h-screen">
            <Navigation />
            <main className="flex-1 overflow-hidden">
              <ProtectedRoutes />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
