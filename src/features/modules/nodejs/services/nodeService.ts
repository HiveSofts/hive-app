import { SiNpm } from "@react-icons/all-files/si/SiNpm";
import { SiYarn } from "@react-icons/all-files/si/SiYarn";
import { Cake } from "lucide-react";
import { SiPnpm } from "react-icons/si";

import { GlobalPackage, NodeVersion, PackageManager, Project } from "../types";

export const AVAILABLE_VERSIONS: NodeVersion[] = [
    {
        id: "22",
        major: "22",
        full: "22.14.0",
        lts: true,
        installPath: "~/.hive/node/22",
        installedAt: "",
        state: "not-installed",
        isDefault: false,
        downloadSize: "~35 MB",
    },
    {
        id: "20",
        major: "20",
        full: "20.18.1",
        lts: true,
        installPath: "~/.hive/node/20",
        installedAt: "2024-12-01",
        state: "installed",
        isDefault: true,
        downloadSize: "~34 MB",
    },
    {
        id: "18",
        major: "18",
        full: "18.20.5",
        lts: true,
        installPath: "~/.hive/node/18",
        installedAt: "2024-09-15",
        state: "installed",
        isDefault: false,
        downloadSize: "~33 MB",
    },
    {
        id: "23",
        major: "23",
        full: "23.6.0",
        lts: false,
        installPath: "~/.hive/node/23",
        installedAt: "",
        state: "not-installed",
        isDefault: false,
        downloadSize: "~36 MB",
    },
];

export const MOCK_PROJECTS: Project[] = [
    { id: 1, name: "my-blog", type: "laravel", nodeVersion: null },
    { id: 2, name: "dashboard-app", type: "react", nodeVersion: "20" },
    { id: 3, name: "api-gateway", type: "nextjs", nodeVersion: null },
    { id: 4, name: "vue-portfolio", type: "vue", nodeVersion: "18" },
    { id: 5, name: "nuxt-shop", type: "nuxt", nodeVersion: "20" },
];

export const INITIAL_PACKAGES: GlobalPackage[] = [
    { name: "next", version: "15.1.0", description: "Next.js framework" },
    { name: "nuxt", version: "3.14.0", description: "Nuxt.js framework" },
    { name: "vite", version: "6.0.3", description: "Next generation frontend tooling" },
    { name: "typescript", version: "5.7.2", description: "TypeScript compiler" },
    { name: "nodemon", version: "3.1.7", description: "Auto-restart node applications" },
    { name: "pm2", version: "5.4.2", description: "Production process manager" },
];

export const PACKAGE_MANAGERS: PackageManager[] = [
    {
        id: "npm",
        name: "npm",
        icon: SiNpm,
        version: "10.9.0",
        installed: true,
    },
    {
        id: "yarn",
        name: "Yarn",
        icon: SiYarn,
        version: "1.22.22",
        installed: true,
    },
    {
        id: "pnpm",
        name: "pnpm",
        icon: SiPnpm,
        version: "9.15.0",
        installed: false,
    },
    {
        id: "bun",
        name: "Bun",
        icon: Cake,
        version: "1.1.38",
        installed: false,
    },
];

export const getVersions = () => AVAILABLE_VERSIONS;
export const getProjects = () => MOCK_PROJECTS;
export const getPackages = () => INITIAL_PACKAGES;
export const getPackageManagers = () => PACKAGE_MANAGERS;
