import { TerminalShell } from "../laravel/TerminalShell";

interface ReactShellPanelProps {
    projectPath: string;
    packageManager?: string;
}

export function ReactShellPanel({ projectPath, packageManager = "npm" }: ReactShellPanelProps) {
    const projectName = projectPath.split("/").pop()?.split("\\").pop() || "react-app";
    
    return (
        <TerminalShell 
            projectPath={projectPath}
            projectName={projectName}
            projectType="React"
            version="18"
            packageManager={packageManager}
            shellLabel="bash"
        />
    );
}