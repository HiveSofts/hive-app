import { Activity, Bell, Globe, Layers, Package, Server, TrendingUp, Zap } from "lucide-react";
import { useDashboard } from "../hooks";
import { useNotifications } from "../hooks";
import { StatusBar } from "../components/StatusBar";
import { QuickStats } from "../components/QuickStats";
import { Section } from "../components/Section";
import { ProjectCards } from "../components/ProjectCards";
import { ResourceChart } from "../components/ResourceChart";
import { LogStream } from "../components/LogStream";
import { SmartShortcuts } from "../components/SmartShortcuts";
import { NotificationCenter } from "../components/NotificationCenter";
import { ServicesPanel } from "../components/ServicesPanel";
import { DnsProxy } from "../components/DnsProxy";
import { Widgets } from "../components/Widgets";
import { dashboardService } from "../services/dashboard.service";
import { useQuery } from "@tanstack/react-query";
import { Project, Service } from "../types";

export default function DashboardPage() {
  const { metrics, health, refreshing, widgets, setWidgets, refresh } = useDashboard();
  const { handleAction } = useNotifications();

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => dashboardService.getProjects(),
  });

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: () => dashboardService.getServices(),
  });

  const handleToggleStatus = async (project: Project) => {
    await dashboardService.toggleProjectStatus(project.id);
  };

  const handleTogglePin = async (project: Project) => {
    console.log("Toggle pin:", project);
  };

  const handleOpenProject = (project: Project) => {
    console.log("Open project:", project);
  };

  const handleOpenTerminal = (project: Project) => {
    console.log("Open terminal:", project);
  };

  const handleOpenPreview = (project: Project) => {
    console.log("Open preview:", project);
  };

  const handleServiceToggle = async (service: Service) => {
    await dashboardService.toggleServiceStatus(service.id);
  };

  const handleServiceRestart = (service: Service) => {
    console.log("Restart service:", service);
  };

  const handleCommandRun = (command: string, project?: string) => {
    console.log(`Running command: ${command} in project: ${project || 'global'}`);
  };

  return (
    <div className="min-h-screen p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <StatusBar health={health} metrics={metrics} onRefresh={refresh} refreshing={refreshing} />

      <QuickStats 
        projects={projectsData || []} 
        services={services || []}
        phpVersion="8.3"
        activeDomains={4}
        domainsLabel="*.test · *.local"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <Section title="Projects" icon={<Layers className="w-4 h-4" />}>
            <ProjectCards 
              projects={projectsData || []}
              onToggleStatus={handleToggleStatus}
              onTogglePin={handleTogglePin}
              onOpenProject={handleOpenProject}
              onOpenTerminal={handleOpenTerminal}
              onOpenPreview={handleOpenPreview}
            />
          </Section>

          <Section title="Resource Monitor" icon={<TrendingUp className="w-4 h-4" />}>
            <ResourceChart metrics={metrics} />
          </Section>

          <Section title="Log Stream" icon={<Activity className="w-4 h-4" />}>
            <LogStream />
          </Section>

          <Section title="Smart Shortcuts" icon={<Zap className="w-4 h-4" />}>
            <SmartShortcuts onCommandRun={handleCommandRun} />
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
            <NotificationCenter onActionClick={handleAction} />
          </Section>

          <Section title="Services" icon={<Server className="w-4 h-4" />}>
            <ServicesPanel 
              services={services || []}
              onToggleStatus={handleServiceToggle}
              onRestart={handleServiceRestart}
            />
          </Section>

          <Section title="DNS & Proxy" icon={<Globe className="w-4 h-4" />}>
            <DnsProxy />
          </Section>
        </div>
      </div>

      <Section title="Widgets" icon={<Package className="w-4 h-4" />} defaultOpen={true}>
        <Widgets widgets={widgets} setWidgets={setWidgets} />
      </Section>
    </div>
  );
}