import { Suspense, lazy } from "react";

import { createBrowserRouter } from "react-router-dom";

import { LoadingSpinner } from "@/components/loading-spinner";
import { AppLayout } from "@/layouts/app-layout";
import NotFoundPage from "@/pages/NotFoundPage.tsx";

const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard.tsx"));
const ProjectsListPage = lazy(() => import("@/pages/projects/ProjectsListPage"));
const CreateProjectPage = lazy(() => import("@/pages/projects/CreateProjectPage"));
const ProjectDetailPage = lazy(() => import("@/pages/projects/Projectdetailpage"));
const PhpManagerPage = lazy(() => import("@/pages/php/PhpManagerPage"));
const NodeManagerPage = lazy(() => import("@/pages/nodejs/NodeManagerPage"));
const PythonManagerPage = lazy(() => import("@/pages/python/PythonManagerPage"));
const DatabaseManagerPage = lazy(() => import("@/pages/database/DatabaseManagerPage"));
const TunnelManagerPage = lazy(() => import("@/pages/tunnel/TunnelManagerPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));

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
                path: "python",
                element: (
                    <LazyPage>
                        <PythonManagerPage />
                    </LazyPage>
                ),
            },
            {
                path: "databases",
                element: (
                    <LazyPage>
                        <DatabaseManagerPage />
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
        ],
    },
    {
        path: "*",
        element: <NotFoundPage />,
    },
]);
