import NotFoundPage from "@/features/NotFoundPage";
import DockerDatabaseManagerPage from "@/features/docker/DockerDatabaseManagerPage";
import DockerManagerPage from "@/features/docker/DockerManagerPage";
import RuntimeManagerPage from "@/features/runtimes/RuntimeManagerPage";

import { Suspense, lazy } from "react";

import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/components/layouts/app-layout";
import { LoadingSpinner } from "@/components/loading-spinner";

const Dashboard = lazy(() => import("@/features/dashboard/Dashboard"));
const ProjectsListPage = lazy(() => import("@/features/projects/pages/ProjectsListPage"));
const CreateProjectPage = lazy(() => import("@/features/projects/pages/CreateProjectPage"));
const ProjectDetailPage = lazy(() => import("@/features/projects/pages/ProjectDetailPage"));
const TunnelManagerPage = lazy(() => import("@/features/tunnel/TunnelManagerPage"));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));

function LazyPage({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
    {
        path: "/",
        element: <AppLayout />,
        children: [
            {
                index: true,
                element: (
                    <LazyPage>
                        <Dashboard />
                    </LazyPage>
                ),
            },
            {
                path: "projects",
                element: (
                    <LazyPage>
                        <ProjectsListPage />
                    </LazyPage>
                ),
            },
            {
                path: "projects/new",
                element: (
                    <LazyPage>
                        <CreateProjectPage />
                    </LazyPage>
                ),
            },
            {
                path: "projects/:id",
                element: (
                    <LazyPage>
                        <ProjectDetailPage />
                    </LazyPage>
                ),
            },
            {
                path: "runtimes",
                element: (
                    <LazyPage>
                        <RuntimeManagerPage />
                    </LazyPage>
                ),
            },
            {
                path: "databases",
                element: (
                    <LazyPage>
                        <DockerDatabaseManagerPage />
                    </LazyPage>
                ),
            },
            {
                path: "tunnel",
                element: (
                    <LazyPage>
                        <TunnelManagerPage />
                    </LazyPage>
                ),
            },
            {
                path: "settings",
                element: (
                    <LazyPage>
                        <SettingsPage />
                    </LazyPage>
                ),
            },
            {
                path: "docker",
                element: (
                    <LazyPage>
                        <DockerManagerPage />
                    </LazyPage>
                ),
            },
        ],
    },
    {
        path: "*",
        element: <NotFoundPage />,
    },
]);
