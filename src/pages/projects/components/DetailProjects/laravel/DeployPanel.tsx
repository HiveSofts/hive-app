import { useEffect, useRef, useState } from "react";

import { ChevronRight, Download, Edit3, Rocket, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

const DEPLOY_PHP_TEMPLATE = `<?php
namespace Deployer;

require __DIR__.'/vendor/deployer/deployer/recipe/laravel.php';

set('repository', 'YOUR_REPO_URL_HERE');
set('git_tty', false);
set('keep_releases', 10);
set('shared_files', ['.env']);
set('shared_dirs', ['storage']);
set('writable_mode', 'chmod');
set('writable_chmod_mode', '0775');
set('writable_chmod_recursive', true);
set('writable_dirs', ['storage', 'bootstrap/cache']);

host('YOUR_SERVER_IP')
    ->set('hostname', 'YOUR_SERVER_IP')
    ->set('remote_user', 'ubuntu')
    ->set('deploy_path', '/home/ubuntu/apps/YOUR_APP_NAME');

task('deploy:update_code', function () {
    $releasePath = get('release_path');
    $repoUrl = get('repository');
    run("mkdir -p $releasePath");
    run("cd $releasePath && curl -L -o release.zip \\"$repoUrl\\"");
    run("cd $releasePath && unzip -q -o release.zip");
    run("cd $releasePath && rm -f release.zip");
    run("cd $releasePath && mkdir -p storage/framework/{sessions,views,cache} storage/logs");
    run("cd $releasePath && mkdir -p bootstrap/cache");
});

task('setup:env', function () {
    $sharedEnvPath = '{{deploy_path}}/shared/.env';
    $releaseEnvPath = '{{release_path}}/.env';
    if (! test("[ -f $sharedEnvPath ]")) {
        run("cp {{release_path}}/.env.example $sharedEnvPath");
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

task('artisan:migrate', function () {
    run('cd {{release_path}} && php artisan migrate --force');
});

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
`;

export function DeployPanel() {
    const [deployerInstalled, setDeployerInstalled] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [step, setStep] = useState<"config" | "editor" | "deploy">("config");
    const [deployRunning, setDeployRunning] = useState(false);
    const [deployLog, setDeployLog] = useState<string[]>([]);
    const [sshConfig, setSshConfig] = useState({
        host: "",
        user: "ubuntu",
        path: "/home/ubuntu/apps/",
        repo: "",
        keyPath: "~/.ssh/id_rsa",
    });
    const [deployPhp, setDeployPhp] = useState(DEPLOY_PHP_TEMPLATE);
    const logRef = useRef<HTMLDivElement>(null);

    const installDeployer = () => {
        setInstalling(true);
        setTimeout(() => {
            setInstalling(false);
            setDeployerInstalled(true);
        }, 3000);
    };

    const startDeploy = () => {
        setDeployRunning(true);
        setDeployLog([]);
        const lines = [
            "✔  Starting deploy process...",
            "✔  deploy:prepare",
            "✔  deploy:update_code — Fetching repository...",
            "✔  setup:env — Linking .env file",
            "✔  deploy:shared — Linking shared directories",
            "✔  deploy:vendors — Running composer install",
            "✔  deploy:writable — Setting permissions",
            "✔  artisan:storage:link",
            "✔  artisan:config:cache",
            "✔  artisan:route:cache",
            "✔  artisan:view:cache",
            "✔  deploy:symlink — Activating new release",
            "✔  artisan:optimize",
            "✔  reload:services — Reloading nginx, php-fpm, supervisor",
            "✔  deploy:cleanup — Keeping last 10 releases",
            "",
            "🚀  Successfully deployed in 42.3s",
        ];
        lines.forEach((line, i) =>
            setTimeout(() => {
                setDeployLog((l) => [...l, line]);
                if (i === lines.length - 1) setDeployRunning(false);
            }, i * 350)
        );
    };

    useEffect(() => {
        logRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [deployLog]);

    if (!deployerInstalled)
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

    return (
        <div className="space-y-4">
            <div className="flex gap-1.5">
                {(["config", "editor", "deploy"] as const).map((s, i) => (
                    <button
                        key={s}
                        onClick={() => setStep(s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${step === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                        <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${step === s ? "bg-background text-foreground" : "bg-muted"}`}
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
                        {
                            label: "Server IP / Host",
                            key: "host",
                            placeholder: "192.168.1.100",
                            type: "text",
                        },
                        { label: "SSH User", key: "user", placeholder: "ubuntu", type: "text" },
                        {
                            label: "Deploy path",
                            key: "path",
                            placeholder: "/home/ubuntu/apps/my-app",
                            type: "text",
                        },
                        {
                            label: "Repository URL",
                            key: "repo",
                            placeholder: "https://github.com/user/repo/archive/main.zip",
                            type: "text",
                        },
                        {
                            label: "SSH Key path",
                            key: "keyPath",
                            placeholder: "~/.ssh/id_rsa",
                            type: "text",
                        },
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
                                type={f.type}
                            />
                        </div>
                    ))}
                    <Button
                        onClick={() => setStep("editor")}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                        Next: Edit deploy.php <ChevronRight className="w-4 h-4" />
                    </Button>
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
                        >
                            <Save className="w-3 h-3" />
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
                    <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Deploy to production</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                {sshConfig.host || "your-server"} ·{" "}
                                {sshConfig.path || "/path/to/app"}
                            </p>
                        </div>
                        <Button
                            onClick={startDeploy}
                            disabled={deployRunning}
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
