import { DatabasePanel } from "@/features/projects/components/detail/laravel/DatabasePanel";
import { DeployPanel } from "@/features/projects/components/detail/laravel/DeployPanel";
import { LogsPanel } from "@/features/projects/components/detail/laravel/LogsPanel";
import { MetricsPanel } from "@/features/projects/components/detail/laravel/MetricsPanel";
import { PackagesPanel } from "@/features/projects/components/detail/laravel/PackagesPanel";
import { QueuesPanel } from "@/features/projects/components/detail/laravel/QueuesPanel";
import { ReadmePanel } from "@/features/projects/components/detail/laravel/ReadmePanel";
import { SchedulesPanel } from "@/features/projects/components/detail/laravel/SchedulesPanel";
import { TerminalShell } from "@/features/projects/components/detail/laravel/TerminalShell";
import { NextjsBuildPanel } from "@/features/projects/components/detail/nextjs/NextjsBuildPanel";
import { NextjsDependenciesPanel } from "@/features/projects/components/detail/nextjs/NextjsDependenciesPanel";
import { NextjsDeployPanel } from "@/features/projects/components/detail/nextjs/NextjsDeployPanel";
import { NextjsLogsPanel } from "@/features/projects/components/detail/nextjs/NextjsLogsPanel";
import { NextjsOverviewPanel } from "@/features/projects/components/detail/nextjs/NextjsOverviewPanel";
import { NextjsShellPanel } from "@/features/projects/components/detail/nextjs/NextjsShellPanel";
import { NodejsLogsPanel } from "@/features/projects/components/detail/nodejs/NodejsLogsPanel";
import { NodejsOverviewPanel } from "@/features/projects/components/detail/nodejs/NodejsOverviewPanel";
import { NodejsPackagesPanel } from "@/features/projects/components/detail/nodejs/NodejsPackagesPanel";
import { NodejsShellPanel } from "@/features/projects/components/detail/nodejs/NodejsShellPanel";
import { PhpComposerPanel } from "@/features/projects/components/detail/php/PhpComposerPanel";
import { PhpExtensionsPanel } from "@/features/projects/components/detail/php/PhpExtensionsPanel";
import { PhpLogsPanel } from "@/features/projects/components/detail/php/PhpLogsPanel";
import { PhpOverviewPanel } from "@/features/projects/components/detail/php/PhpOverviewPanel";
import { PhpShellPanel } from "@/features/projects/components/detail/php/PhpShellPanel";
import { ReactBuildPanel } from "@/features/projects/components/detail/react/ReactBuildPanel";
import { ReactDependenciesPanel } from "@/features/projects/components/detail/react/ReactDependenciesPanel";
import { ReactDeployPanel } from "@/features/projects/components/detail/react/ReactDeployPanel";
import { ReactLogsPanel } from "@/features/projects/components/detail/react/ReactLogsPanel";
import { ReactOverviewPanel } from "@/features/projects/components/detail/react/ReactOverviewPanel";
import { ReactShellPanel } from "@/features/projects/components/detail/react/ReactShellPanel";
import { StaticOverviewPanel } from "@/features/projects/components/detail/static/StaticOverviewPanel";
import { StaticShellPanel } from "@/features/projects/components/detail/static/StaticShellPanel";
import { ViteBuildPanel } from "@/features/projects/components/detail/vite/ViteBuildPanel";
import { ViteDependenciesPanel } from "@/features/projects/components/detail/vite/ViteDependenciesPanel";
import { ViteLogsPanel } from "@/features/projects/components/detail/vite/ViteLogsPanel";
import { ViteOverviewPanel } from "@/features/projects/components/detail/vite/ViteOverviewPanel";
import { ViteShellPanel } from "@/features/projects/components/detail/vite/ViteShellPanel";
import { VueBuildPanel } from "@/features/projects/components/detail/vue/VueBuildPanel";
import { VueDependenciesPanel } from "@/features/projects/components/detail/vue/VueDependenciesPanel";
import { VueLogsPanel } from "@/features/projects/components/detail/vue/VueLogsPanel";
import { VueOverviewPanel } from "@/features/projects/components/detail/vue/VueOverviewPanel";
import { VueShellPanel } from "@/features/projects/components/detail/vue/VueShellPanel";
import { WordPressDatabasePanel } from "@/features/projects/components/detail/wordpress/WordPressDatabasePanel";
import { WordPressLogsPanel } from "@/features/projects/components/detail/wordpress/WordPressLogsPanel";
import { WordPressOverviewPanel } from "@/features/projects/components/detail/wordpress/WordPressOverviewPanel";
import { WordPressPluginsPanel } from "@/features/projects/components/detail/wordpress/WordPressPluginsPanel";
import { WordPressThemesPanel } from "@/features/projects/components/detail/wordpress/WordPressThemesPanel";
import type { PanelConfig, ProjectType, TabConfig } from "@/features/projects/types";

interface ProjectConfig {
    tabs: TabConfig[];
    panels: PanelConfig[];
}

export const PROJECT_DETAIL_CONFIG: Record<ProjectType, ProjectConfig> = {
    laravel: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "queues", label: "Queues", icon: "📋" },
            { id: "schedules", label: "Schedules", icon: "📅" },
            { id: "logs", label: "Logs", icon: "📄" },
            { id: "packages", label: "Packages", icon: "📦" },
            { id: "database", label: "Database", icon: "🗄️" },
            { id: "deploy", label: "Deploy", icon: "🚀" },
        ],
        panels: [
            { id: "overview", component: MetricsPanel },
            { id: "overview", component: ReadmePanel, props: { content: (p: any) => p.readme } },
            { id: "shell", component: TerminalShell },
            { id: "queues", component: QueuesPanel },
            { id: "schedules", component: SchedulesPanel },
            { id: "logs", component: LogsPanel },
            { id: "packages", component: PackagesPanel },
            { id: "database", component: DatabasePanel, props: { db: (p: any) => p.database } },
            { id: "deploy", component: DeployPanel },
        ],
    },
    react: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "dependencies", label: "Dependencies", icon: "📦" },
            { id: "build", label: "Build", icon: "🔨" },
            { id: "logs", label: "Logs", icon: "📄" },
            { id: "deploy", label: "Deploy", icon: "🚀" },
        ],
        panels: [
            {
                id: "overview",
                component: ReactOverviewPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                    nodeVersion: (p: any) => p.nodeVersion,
                    host: (p: any) => p.host,
                    port: (p: any) => p.port,
                    description: (p: any) => p.description,
                    github_repo: (p: any) => p.github_repo,
                    created_at: (p: any) => p.created_at,
                },
            },
            {
                id: "shell",
                component: ReactShellPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            {
                id: "dependencies",
                component: ReactDependenciesPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            {
                id: "build",
                component: ReactBuildPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            {
                id: "logs",
                component: ReactLogsPanel,
            },
            {
                id: "deploy",
                component: ReactDeployPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
        ],
    },
    nextjs: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "dependencies", label: "Dependencies", icon: "📦" },
            { id: "build", label: "Build", icon: "🔨" },
            { id: "logs", label: "Logs", icon: "📄" },
            { id: "deploy", label: "Deploy", icon: "🚀" },
        ],
        panels: [
            {
                id: "overview",
                component: NextjsOverviewPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                    nodeVersion: (p: any) => p.nodeVersion,
                    host: (p: any) => p.host,
                    port: (p: any) => p.port,
                    description: (p: any) => p.description,
                    github_repo: (p: any) => p.github_repo,
                    created_at: (p: any) => p.created_at,
                },
            },
            {
                id: "shell",
                component: NextjsShellPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            {
                id: "dependencies",
                component: NextjsDependenciesPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            {
                id: "build",
                component: NextjsBuildPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            { id: "logs", component: NextjsLogsPanel },
            {
                id: "deploy",
                component: NextjsDeployPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
        ],
    },
    vue: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "dependencies", label: "Dependencies", icon: "📦" },
            { id: "build", label: "Build", icon: "🔨" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [
            {
                id: "overview",
                component: VueOverviewPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                    nodeVersion: (p: any) => p.nodeVersion,
                    host: (p: any) => p.host,
                    port: (p: any) => p.port,
                    description: (p: any) => p.description,
                    github_repo: (p: any) => p.github_repo,
                    created_at: (p: any) => p.created_at,
                },
            },
            {
                id: "shell",
                component: VueShellPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            {
                id: "dependencies",
                component: VueDependenciesPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            {
                id: "build",
                component: VueBuildPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            { id: "logs", component: VueLogsPanel },
        ],
    },
    vite: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "dependencies", label: "Dependencies", icon: "📦" },
            { id: "build", label: "Build", icon: "🔨" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [
            {
                id: "overview",
                component: ViteOverviewPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                    nodeVersion: (p: any) => p.nodeVersion,
                    host: (p: any) => p.host,
                    port: (p: any) => p.port,
                    description: (p: any) => p.description,
                    github_repo: (p: any) => p.github_repo,
                    created_at: (p: any) => p.created_at,
                },
            },
            {
                id: "shell",
                component: ViteShellPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            {
                id: "dependencies",
                component: ViteDependenciesPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            {
                id: "build",
                component: ViteBuildPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            { id: "logs", component: ViteLogsPanel },
        ],
    },
    nodejs: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "packages", label: "Packages", icon: "📦" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [
            {
                id: "overview",
                component: NodejsOverviewPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                    nodeVersion: (p: any) => p.nodeVersion,
                    host: (p: any) => p.host,
                    port: (p: any) => p.port,
                    description: (p: any) => p.description,
                    github_repo: (p: any) => p.github_repo,
                    created_at: (p: any) => p.created_at,
                },
            },
            {
                id: "shell",
                component: NodejsShellPanel,
            },
            {
                id: "packages",
                component: NodejsPackagesPanel,
                props: {
                    packageManager: (p: any) => p.package_manager,
                },
            },
            { id: "logs", component: NodejsLogsPanel },
        ],
    },
    php: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "composer", label: "Composer", icon: "📦" },
            { id: "extensions", label: "Extensions", icon: "🔌" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [
            {
                id: "overview",
                component: PhpOverviewPanel,
                props: {
                    phpVersion: (p: any) => p.phpVersion,
                    entryPoint: (p: any) => p.entryPoint,
                    host: (p: any) => p.host,
                    port: (p: any) => p.port,
                    description: (p: any) => p.description,
                    github_repo: (p: any) => p.github_repo,
                    created_at: (p: any) => p.created_at,
                },
            },
            { id: "shell", component: PhpShellPanel },
            { id: "composer", component: PhpComposerPanel },
            {
                id: "extensions",
                component: PhpExtensionsPanel,
                props: {
                    version: (p: any) => p.phpVersion,
                },
            },
            { id: "logs", component: PhpLogsPanel },
        ],
    },
    html5: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
        ],
        panels: [
            {
                id: "overview",
                component: StaticOverviewPanel,
                props: {
                    index_path: (p: any) => p.index_path,
                    host: (p: any) => p.host,
                    port: (p: any) => p.port,
                    description: (p: any) => p.description,
                    github_repo: (p: any) => p.github_repo,
                    created_at: (p: any) => p.created_at,
                },
            },
            {
                id: "shell",
                component: StaticShellPanel,
                props: {
                    package_manager: (p: any) => p.package_manager,
                },
            },
        ],
    },
    wordpress: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "plugins", label: "Plugins", icon: "🧩" },
            { id: "themes", label: "Themes", icon: "🎨" },
            { id: "database", label: "Database", icon: "🗄️" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [
            {
                id: "overview",
                component: WordPressOverviewPanel,
                props: {
                    version: (p: any) => p.version,
                    host: (p: any) => p.host,
                    port: (p: any) => p.port,
                    description: (p: any) => p.description,
                    sourceType: (p: any) => p.source_type,
                    githubRepo: (p: any) => p.github_repo,
                    created_at: (p: any) => p.created_at,
                    dbDriver: (p: any) => p.dbDriver,
                    dbName: (p: any) => p.dbName,
                    dbUser: (p: any) => p.dbUser,
                    dbHost: (p: any) => p.dbHost,
                    dbPort: (p: any) => p.dbPort,
                    siteTitle: (p: any) => p.siteTitle,
                    siteUrl: (p: any) => p.siteUrl,
                    adminUser: (p: any) => p.adminUser,
                    adminEmail: (p: any) => p.adminEmail,
                },
            },
            { id: "plugins", component: WordPressPluginsPanel },
            { id: "themes", component: WordPressThemesPanel },
            {
                id: "database",
                component: WordPressDatabasePanel,
                props: {
                    dbDriver: (p: any) => p.dbDriver,
                    dbName: (p: any) => p.dbName,
                    dbUser: (p: any) => p.dbUser,
                    dbHost: (p: any) => p.dbHost,
                    dbPort: (p: any) => p.dbPort,
                },
            },
            { id: "logs", component: WordPressLogsPanel },
        ],
    },
    go: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "dependencies", label: "Dependencies", icon: "📦" },
            { id: "build", label: "Build", icon: "🔨" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [],
    },
    gin: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "dependencies", label: "Dependencies", icon: "📦" },
            { id: "build", label: "Build", icon: "🔨" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [],
    },
    docker: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "containers", label: "Containers", icon: "🐳" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [],
    },
    django: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "dependencies", label: "Dependencies", icon: "📦" },
            { id: "migrations", label: "Migrations", icon: "🔄" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [],
    },
    nginx: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "config", label: "Config", icon: "⚙️" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [],
    },
    fastapi: {
        tabs: [
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "shell", label: "Shell", icon: "💻" },
            { id: "dependencies", label: "Dependencies", icon: "📦" },
            { id: "docs", label: "API Docs", icon: "📚" },
            { id: "logs", label: "Logs", icon: "📄" },
        ],
        panels: [],
    },
};

export const getProjectTabs = (type: ProjectType): TabConfig[] => {
    return PROJECT_DETAIL_CONFIG[type]?.tabs || PROJECT_DETAIL_CONFIG.html5.tabs;
};

export const getProjectPanels = (type: ProjectType, project: any): PanelConfig[] => {
    const config = PROJECT_DETAIL_CONFIG[type];
    if (!config) return [];

    return config.panels.map((panel) => {
        if (panel.props) {
            const resolvedProps: Record<string, any> = {};
            Object.entries(panel.props).forEach(([key, value]) => {
                resolvedProps[key] = typeof value === "function" ? value(project) : value;
            });
            return { ...panel, props: resolvedProps };
        }
        return panel;
    });
};
