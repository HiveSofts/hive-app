import { useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { ChevronRight, Download, Edit3, Rocket, Save, Square, Undo2, Unlock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeployConfig {
    host: string;
    user: string;
    path: string;
    repo: string;
    key_path: string;
}

interface DeployResult {
    success: boolean;
    output: string[];
    duration: number;
}

interface DeployPhpContent {
    content: string;
    path: string;
}

interface DeployPanelProps {
    projectPath: string;
}

export function DeployPanel({ projectPath }: DeployPanelProps) {
    const [deployerInstalled, setDeployerInstalled] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [step, setStep] = useState<"config" | "editor" | "deploy">("config");
    const [deployRunning, setDeployRunning] = useState(false);
    const [deployLog, setDeployLog] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingPhp, setSavingPhp] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [sshConfig, setSshConfig] = useState<DeployConfig>({
        host: "",
        user: "ubuntu",
        path: "/home/ubuntu/apps/",
        repo: "",
        key_path: "~/.ssh/id_rsa",
    });
    const [deployPhp, setDeployPhp] = useState("");
    const [initialLoad, setInitialLoad] = useState(true);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadDeployerStatus();
        loadDeployConfig();
        loadDeployPhpContent();
    }, [projectPath]);

    const loadDeployerStatus = async () => {
        try {
            const installed = await invoke<boolean>("check_deployer_installed");
            setDeployerInstalled(installed);
        } catch (error) {
            console.error("Failed to check deployer status:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadDeployConfig = async () => {
        try {
            const config = await invoke<DeployConfig>("get_deploy_config", { projectPath });
            setSshConfig(config);
        } catch (error) {
            console.error("Failed to load deploy config:", error);
        }
    };

    const loadDeployPhpContent = async () => {
        try {
            const result = await invoke<DeployPhpContent>("get_deploy_php_content", {
                projectPath,
            });
            if (result && result.content) {
                setDeployPhp(result.content);
            } else {
                const defaultContent = generateDefaultDeployPhp();
                setDeployPhp(defaultContent);
            }
            setInitialLoad(false);
        } catch (error) {
            console.error("Failed to load deploy.php content:", error);
            const defaultContent = generateDefaultDeployPhp();
            setDeployPhp(defaultContent);
            setInitialLoad(false);
        }
    };

    const generateDefaultDeployPhp = () => {
        return `<?php

namespace Deployer;

require 'recipe/laravel.php';

// ============================================
// REPOSITORY
// ============================================
set('repository', '${sshConfig.repo || "YOUR_REPO_URL_HERE"}');
set('git_tty', false);
set('keep_releases', 10);

// ============================================
// SHARED FILES & DIRS
// ============================================
set('shared_files', ['.env']);
set('shared_dirs', ['storage']);

// ============================================
// WRITABLE PERMISSIONS
// ============================================
set('writable_mode', 'chmod');
set('writable_chmod_mode', '0775');
set('writable_chmod_recursive', true);
set('writable_dirs', ['storage', 'bootstrap/cache']);

// ============================================
// HOSTS
// ============================================
host('${sshConfig.host || "YOUR_SERVER_IP"}')
    ->set('hostname', '${sshConfig.host || "YOUR_SERVER_IP"}')
    ->set('remote_user', '${sshConfig.user || "ubuntu"}')
    ->set('deploy_path', '${sshConfig.path || "/home/ubuntu/apps/YOUR_APP_NAME"}');

// ============================================
// CUSTOM TASKS
// ============================================

task('deploy:update_code', function () {
    $releasePath = get('release_path');
    $repoUrl = get('repository');
    
    run("mkdir -p $releasePath");
    run("cd $releasePath && curl -L -o release.zip \"$repoUrl\"");
    run("cd $releasePath && unzip -q -o release.zip");
    run("cd $releasePath && mv -f *-main/* . 2>/dev/null || mv -f *-*/* . 2>/dev/null || true");
    run("cd $releasePath && rm -f release.zip");
    run("cd $releasePath && rm -rf *-main *-* 2>/dev/null || true");
    run("cd $releasePath && mkdir -p storage/framework/{sessions,views,cache} storage/logs");
    run("cd $releasePath && mkdir -p bootstrap/cache");
});

task('setup:env', function () {
    $sharedEnvPath = '{{deploy_path}}/shared/.env';
    $releaseEnvPath = '{{release_path}}/.env';
    
    if (! test("[ -f $sharedEnvPath ]")) {
        run("cp {{release_path}}/.env.pro $sharedEnvPath 2>/dev/null || cp {{release_path}}/.env.example $sharedEnvPath");
    }
    run("ln -sfn $sharedEnvPath $releaseEnvPath");
});

task('reload:services', function () {
    run('sudo systemctl reload nginx || true');
    run('sudo systemctl reload php8.3-fpm || true');
    run('sudo supervisorctl reread');
    run('sudo supervisorctl update');
    run('sudo supervisorctl restart laravel-worker:* 2>/dev/null || true');
});

task('deploy:writable', function () {
    $dirs = implode(' ', get('writable_dirs'));
    $mode = get('writable_chmod_mode');
    $releasePath = get('release_path');
    
    run("cd $releasePath && sudo chown -R www-data:www-data $dirs");
    run("cd $releasePath && sudo find $dirs -type d -exec chmod $mode {} \\;");
    run("cd $releasePath && sudo find $dirs -type f -exec chmod 664 {} \\;");
});

task('artisan:optimize', function () {
    run('cd {{release_path}} && php artisan optimize 2>/dev/null || true');
});

task('artisan:view:cache', function () {
    run('cd {{release_path}} && php artisan view:cache 2>/dev/null || true');
});

task('artisan:config:cache', function () {
    run('cd {{release_path}} && php artisan config:cache');
});

task('artisan:route:cache', function () {
    run('cd {{release_path}} && php artisan route:cache 2>/dev/null || true');
});

task('artisan:migrate', function () {
    run('cd {{release_path}} && php artisan migrate --force');
});

// ============================================
// DEPLOY FLOW
// ============================================
task('deploy', [
    'deploy:prepare',
    'deploy:update_code',
    'setup:env',
    'deploy:shared',
    'deploy:vendors',
    'deploy:writable',
    'artisan:storage:link',
    'artisan:config:cache',
    'artisan:route:cache',
    'artisan:view:cache',
    'deploy:symlink',
    'artisan:optimize',
    'reload:services',
    'deploy:cleanup',
]);

after('deploy:failed', 'deploy:unlock');

// ============================================
// ROLLBACK
// ============================================
task('rollback:deploy', [
    'deploy:rollback',
])->desc('Rollback to previous release');

// ============================================
// UNLOCK
// ============================================
task('deploy:unlock', function () {
    run('cd {{deploy_path}} && rm -f .dep/deploy.lock');
})->desc('Unlock deployment');
`;
    };

    const installDeployer = async () => {
        setInstalling(true);
        try {
            await invoke("install_deployer");
            setDeployerInstalled(true);
        } catch (error) {
            console.error("Failed to install deployer:", error);
        } finally {
            setInstalling(false);
        }
    };

    const saveDeployConfig = async () => {
        try {
            await invoke("save_deploy_config", { projectPath, config: sshConfig });
        } catch (error) {
            console.error("Failed to save deploy config:", error);
        }
    };

    const saveDeployPhp = async () => {
        if (!deployPhp.trim()) {
            console.error("deploy.php content is empty");
            return;
        }
        setSavingPhp(true);
        try {
            await invoke("save_deploy_php_content", { projectPath, content: deployPhp });
            await loadDeployPhpContent();
        } catch (error) {
            console.error("Failed to save deploy.php:", error);
        } finally {
            setSavingPhp(false);
        }
    };

    const startDeploy = async () => {
        setDeployRunning(true);
        setDeployLog([]);
        try {
            const result = await invoke<DeployResult>("run_deployment", {
                projectPath,
                config: sshConfig,
                action: "deploy",
            });
            setDeployLog(result.output);
        } catch (error) {
            setDeployLog([`Error: ${error}`]);
        } finally {
            setDeployRunning(false);
        }
    };

    const runRollback = async () => {
        setActionLoading("Rollback");
        setDeployLog([]);
        try {
            const result = await invoke<DeployResult>("run_deploy_rollback", {
                projectPath,
                config: sshConfig,
            });
            setDeployLog(result.output);
        } catch (error) {
            setDeployLog([`Error: ${error}`]);
        } finally {
            setActionLoading(null);
        }
    };

    const runUnlock = async () => {
        setActionLoading("Unlock");
        setDeployLog([]);
        try {
            const result = await invoke<DeployResult>("run_deploy_unlock", {
                projectPath,
                config: sshConfig,
            });
            setDeployLog(result.output);
        } catch (error) {
            setDeployLog([`Error: ${error}`]);
        } finally {
            setActionLoading(null);
        }
    };

    const cancelDeploy = () => {
        setDeployRunning(false);
        setDeployLog((prev) => [...prev, "⚠️ Deployment cancelled by user"]);
    };

    useEffect(() => {
        logRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [deployLog]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!deployerInstalled) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Rocket className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                    <h3 className="font-semibold text-base mb-1">Deployer not installed</h3>
                    <p className="text-sm text-muted-foreground">
                        Deployer is a PHP deployment tool. Install it globally to enable
                        zero-downtime deployments.
                    </p>
                </div>
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-2.5 w-full text-left">
                    <code className="text-[11px] font-mono text-emerald-400">
                        composer require deployer/deployer --global
                    </code>
                </div>
                <Button
                    onClick={installDeployer}
                    disabled={installing}
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                >
                    {installing ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Installing...
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            Install Deployer
                        </>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-1.5">
                {(["config", "editor", "deploy"] as const).map((s, i) => (
                    <button
                        key={s}
                        onClick={() => setStep(s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            step === s
                                ? "bg-foreground text-background border-foreground"
                                : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                step === s ? "bg-background text-foreground" : "bg-muted"
                            }`}
                        >
                            {i + 1}
                        </span>
                        {s === "config"
                            ? "Server Config"
                            : s === "editor"
                              ? "deploy.php"
                              : "Deploy"}
                    </button>
                ))}
            </div>

            {step === "config" && (
                <div className="space-y-3 max-w-lg">
                    {[
                        { label: "Server IP / Host", key: "host", placeholder: "192.168.1.100" },
                        { label: "SSH User", key: "user", placeholder: "ubuntu" },
                        {
                            label: "Deploy path",
                            key: "path",
                            placeholder: "/home/ubuntu/apps/my-app",
                        },
                        {
                            label: "Repository URL",
                            key: "repo",
                            placeholder: "https://github.com/user/repo/archive/main.zip",
                        },
                        { label: "SSH Key path", key: "key_path", placeholder: "~/.ssh/id_rsa" },
                    ].map((f) => (
                        <div key={f.key} className="space-y-1.5">
                            <Label className="text-xs">{f.label}</Label>
                            <Input
                                value={(sshConfig as any)[f.key]}
                                onChange={(e) =>
                                    setSshConfig((c) => ({ ...c, [f.key]: e.target.value }))
                                }
                                placeholder={f.placeholder}
                                className="font-mono text-xs h-8"
                            />
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <Button onClick={saveDeployConfig} variant="outline" className="gap-2">
                            <Save className="w-4 h-4" />
                            Save Config
                        </Button>
                        <Button
                            onClick={() => setStep("editor")}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            Next: Edit deploy.php <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === "editor" && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">deploy.php</span>
                            <Badge variant="outline" className="text-[10px]">
                                editable
                            </Badge>
                        </div>
                        <Button
                            size="sm"
                            className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1"
                            onClick={saveDeployPhp}
                            disabled={savingPhp || !deployPhp.trim()}
                        >
                            {savingPhp ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save className="w-3 h-3" />
                            )}
                            Save
                        </Button>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950">
                        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
                            <span className="w-2 h-2 rounded-full bg-red-500/80" />
                            <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                            <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                            <span className="ml-2 text-[11px] text-zinc-500 font-mono">
                                deploy.php
                            </span>
                        </div>
                        <textarea
                            value={deployPhp}
                            onChange={(e) => setDeployPhp(e.target.value)}
                            className="w-full bg-transparent text-zinc-300 font-mono text-[11px] p-4 outline-none resize-none leading-relaxed h-[360px]"
                            spellCheck={false}
                            placeholder="No deploy.php content loaded"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setStep("config")}>
                            ← Back
                        </Button>
                        <Button
                            onClick={() => setStep("deploy")}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <Rocket className="w-4 h-4" />
                            Ready to deploy
                        </Button>
                    </div>
                </div>
            )}

            {step === "deploy" && (
                <div className="space-y-3">
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-sm font-medium">Deploy to production</p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                    {sshConfig.host || "your-server"} ·{" "}
                                    {sshConfig.path || "/path/to/app"}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={runUnlock}
                                    disabled={!!actionLoading || deployRunning}
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                >
                                    {actionLoading === "Unlock" ? (
                                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Unlock className="w-3.5 h-3.5" />
                                    )}
                                    Unlock
                                </Button>
                                <Button
                                    onClick={runRollback}
                                    disabled={!!actionLoading || deployRunning}
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                >
                                    {actionLoading === "Rollback" ? (
                                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Undo2 className="w-3.5 h-3.5" />
                                    )}
                                    Rollback
                                </Button>
                                {deployRunning && (
                                    <Button
                                        onClick={cancelDeploy}
                                        variant="destructive"
                                        size="sm"
                                        className="gap-1"
                                    >
                                        <Square className="w-3.5 h-3.5" />
                                        Cancel
                                    </Button>
                                )}
                                <Button
                                    onClick={startDeploy}
                                    disabled={deployRunning || !!actionLoading}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                >
                                    {deployRunning ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Deploying...
                                        </>
                                    ) : (
                                        <>
                                            <Rocket className="w-4 h-4" />
                                            Deploy now
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {deployLog.length > 0 && (
                        <div className="rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-950">
                            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
                                <span className="w-2 h-2 rounded-full bg-red-500/80" />
                                <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                                <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                                <span className="ml-2 text-[11px] text-zinc-500 font-mono">
                                    deploy log
                                </span>
                            </div>
                            <div className="p-4 font-mono text-xs max-h-[280px] overflow-y-auto space-y-0.5">
                                {deployLog.map((l, i) => (
                                    <div
                                        key={i}
                                        className={
                                            l.startsWith("🚀")
                                                ? "text-emerald-400 font-bold mt-1"
                                                : l.startsWith("✔")
                                                  ? "text-zinc-300"
                                                  : l.startsWith("Error") || l.startsWith("⚠️")
                                                    ? "text-red-400"
                                                    : "text-zinc-600"
                                        }
                                    >
                                        {l || "\u00A0"}
                                    </div>
                                ))}
                                {deployRunning && (
                                    <div className="flex items-center gap-2 text-zinc-500">
                                        <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                        Running tasks...
                                    </div>
                                )}
                                <div ref={logRef} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
