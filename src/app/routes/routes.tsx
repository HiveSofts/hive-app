import { Suspense, lazy, ComponentType } from "react";
import { RouteObject } from "react-router-dom";
import NotFoundPage from "@/NotFoundPage";
import { AppLayout } from "../layouts/app-layout";
import { LoadingSpinner } from "../components/loading-spinner";

const withLazyLoading = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = lazy(importFn);
  return function LazyWrapper(props: any) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
};

export const ROUTES = {
  HOME: "/",
  PROJECTS: {
    ROOT: "/projects",
    NEW: "/projects/new",
    DETAIL: "/projects/:id",
  },
  ONBOARDING: "/onboarding",
  NOT_FOUND: "*",
} as const;

const LazyDashboard = withLazyLoading(() => import("@/app/modules/dashboard/pages/DashboardPage"));
const LazyProjectsList = withLazyLoading(() => import("@/app/modules/projects/pages/ProjectsListPage"));
const LazyCreateProject = withLazyLoading(() => import("@/app/modules/projects/pages/CreateProjectPage"));
const LazyProjectDetail = withLazyLoading(() => import("@/app/modules/projects/pages/Projectdetailpage"));
const LazyOnboarding = withLazyLoading(() => import("@/app/modules/onboarding/pages/OnboardingWizard"));

export const routes: RouteObject[] = [
  {
    path: ROUTES.HOME,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <LazyDashboard />,
      },
      {
        path: ROUTES.PROJECTS.ROOT,
        element: <LazyProjectsList />,
      },
      {
        path: ROUTES.PROJECTS.NEW,
        element: <LazyCreateProject />,
      },
      {
        path: ROUTES.PROJECTS.DETAIL,
        element: <LazyProjectDetail />,
      },
    ],
  },
  {
    path: ROUTES.ONBOARDING,
    element: <LazyOnboarding />,
  },
  {
    path: ROUTES.NOT_FOUND,
    element: <NotFoundPage />,
  },
];