import { TerminalShell } from "../laravel/TerminalShell";

interface NextjsShellPanelProps {
    projectPath: string;
    projectName: string;
    projectType?: string;
    version?: string;
    packageManager?: string;
}

function buildQuickGroups(pm: string) {
    const run =
        pm === "npm"
            ? "npm run"
            : pm === "pnpm"
              ? "pnpm"
              : pm === "yarn"
                ? "yarn"
                : pm === "bun"
                  ? "bun run"
                  : "npm run";

    return [
        {
            label: "Scripts",
            items: [`${run} dev`, `${run} build`, `${run} start`, `${run} lint`],
        },
        {
            label: "Deps",
            items: [`${pm} install`, `${pm} update`, "npm outdated", "npm ci"],
        },
        {
            label: "Next",
            items: [
                "npx next lint",
                "npx next build",
                "npx next telemetry disable",
            ],
        },
        {
            label: "Git",
            items: ["git status", "git pull", "git log --oneline -5"],
        },
    ];
}

export function NextjsShellPanel({
    projectPath,
    projectName,
    projectType,
    version,
    packageManager,
}: NextjsShellPanelProps) {
    return (
        <TerminalShell
            projectPath={projectPath}
            projectName={projectName}
            projectType={projectType ?? "Next.js"}
            version={version}
            shellLabel="next"
            quickGroups={buildQuickGroups(packageManager ?? "npm")}
        />
    );
}
