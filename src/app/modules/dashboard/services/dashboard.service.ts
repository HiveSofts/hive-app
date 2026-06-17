import { Project, Service, Metric, HiveHealth, LogEntry } from "../types";
import { LOG_STREAM } from "../constants";

class DashboardService {
  async getProjects(): Promise<Project[]> {
    return [
      {
        id: 1,
        name: "my-blog",
        type: "laravel",
        url: "my-blog.test",
        php: "8.3",
        status: "running",
        pinned: true,
        port: 8000,
      },
      {
        id: 2,
        name: "dashboard-app",
        type: "react",
        url: "dashboard-app.test",
        php: "Node 20",
        status: "running",
        pinned: true,
        port: 3000,
      },
      {
        id: 3,
        name: "api-gateway",
        type: "nextjs",
        url: "api-gateway.test",
        php: "Node 18",
        status: "stopped",
        pinned: false,
        port: 3001,
      },
      {
        id: 4,
        name: "vue-portfolio",
        type: "vue",
        url: "vue-portfolio.test",
        php: "Node 20",
        status: "stopped",
        pinned: false,
        port: 5173,
      },
      {
        id: 5,
        name: "infra-stack",
        type: "docker",
        url: "—",
        php: "—",
        status: "running",
        pinned: false,
        port: 0,
      },
    ];
  }

  async getServices(): Promise<Service[]> {
    return [
      { id: "mysql", name: "MySQL", version: "8.0.37", port: 3306, status: "running", mem: "124 MB" },
      { id: "redis", name: "Redis", version: "7.2.4", port: 6379, status: "running", mem: "8 MB" },
      { id: "nginx", name: "Nginx", version: "1.25.3", port: 80, status: "running", mem: "4 MB" },
      { id: "mailpit", name: "Mailpit", version: "1.19.0", port: 8025, status: "stopped", mem: "—" },
      { id: "minio", name: "MinIO", version: "2024-01", port: 9000, status: "error", mem: "56 MB" },
    ];
  }

  async getHealth(): Promise<HiveHealth> {
    return "ok";
  }

  async getMetrics(): Promise<Metric[]> {
    return Array.from({ length: 30 }, (_, i) => ({
      t: `${30 - i}s`,
      cpu: Math.round(12 + Math.random() * 38),
      ram: Math.round(820 + Math.random() * 220),
      net_in: Math.round(Math.random() * 80),
      net_out: Math.round(Math.random() * 40),
    }));
  }

  async getLogs(): Promise<LogEntry[]> {
    return LOG_STREAM;
  }

  async toggleProjectStatus(projectId: number): Promise<Project> {
    return {
      id: projectId,
      name: "my-blog",
      type: "laravel",
      url: "my-blog.test",
      php: "8.3",
      status: "running",
      pinned: true,
      port: 8000,
    };
  }

  async toggleServiceStatus(serviceId: string): Promise<Service> {
    return {
      id: serviceId,
      name: "MySQL",
      version: "8.0.37",
      port: 3306,
      status: "running",
      mem: "124 MB",
    };
  }
}

export const dashboardService = new DashboardService();