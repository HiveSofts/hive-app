import { TerminalShell } from "../laravel/TerminalShell";

interface ReactShellPanelProps {
    projectPath: string;
    packageManager?: string;
}

export function ReactShellPanel({ projectPath, packageManager }: ReactShellPanelProps) {
    return <TerminalShell projectPath={projectPath} packageManager={packageManager} />;
}
