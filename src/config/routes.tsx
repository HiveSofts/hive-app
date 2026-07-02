import NotFoundPage from "@/features/NotFoundPage";

import { Suspense, lazy } from "react";

import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/components/layouts/app-layout";
import { LoadingSpinner } from "@/components/loading-spinner";
import DockerDatabaseManagerPage from "@/features/docker/DockerDatabaseManagerPage";
import DockerManagerPage from "@/features/docker/DockerManagerPage";

const Dashboard = lazy(() => import("@/features/dashboard/Dashboard"));
const ProjectsListPage = lazy(() => import("@/features/projects/pages/ProjectsListPage"));
const CreateProjectPage = lazy(() => import("@/features/projects/pages/CreateProjectPage"));
const ProjectDetailPage = lazy(() => import("@/features/projects/pages/ProjectDetailPage"));
const PhpManagerPage = lazy(() => import("@/features/modules/php/PhpManagerPage"));
const NodeManagerPage = lazy(() => import("@/features/modules/nodejs/NodeManagerPage"));
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
                path: "php",
                element: (
                    <LazyPage>
                        <PhpManagerPage />
                    </LazyPage>
                ),
            },
            {
                path: "nodejs",
                element: (
                    <LazyPage>
                        <NodeManagerPage />
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
