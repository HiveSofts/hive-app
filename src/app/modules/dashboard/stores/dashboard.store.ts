import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DashboardState, Metric, HiveHealth, WidgetsState } from "../types";

const generateMetrics = (points = 30): Metric[] => {
  return Array.from({ length: points }, (_, i) => ({
    t: `${points - i}s`,
    cpu: Math.round(12 + Math.random() * 38),
    ram: Math.round(820 + Math.random() * 220),
    net_in: Math.round(Math.random() * 80),
    net_out: Math.round(Math.random() * 40),
  }));
};

const defaultWidgets: WidgetsState = {
  php: true,
  node: true,
  db: true,
  ssl: true,
  tunnel: false,
};

interface DashboardStore extends DashboardState {
  setMetrics: (metrics: Metric[] | ((prev: Metric[]) => Metric[])) => void;
  setHealth: (health: HiveHealth) => void;
  setRefreshing: (refreshing: boolean) => void;
  toggleWidget: (key: keyof WidgetsState) => void;
  setWidgets: (widgets: WidgetsState) => void;
  refresh: () => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      metrics: generateMetrics(),
      health: "warn",
      refreshing: false,
      widgets: defaultWidgets,

      setMetrics: (metrics) => {
        if (typeof metrics === "function") {
          set((state) => ({ metrics: metrics(state.metrics) }));
        } else {
          set({ metrics });
        }
      },

      setHealth: (health) => set({ health }),

      setRefreshing: (refreshing) => set({ refreshing }),

      toggleWidget: (key) => {
        set((state) => ({
          widgets: {
            ...state.widgets,
            [key]: !state.widgets[key],
          },
        }));
      },

      setWidgets: (widgets) => set({ widgets }),

      refresh: () => {
        const { setRefreshing, setMetrics } = get();
        setRefreshing(true);
        setMetrics(generateMetrics());
        setTimeout(() => setRefreshing(false), 800);
      },
    }),
    {
      name: "dashboard-storage",
      partialize: (state) => ({
        widgets: state.widgets,
      }),
    }
  )
);