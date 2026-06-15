import { useState } from "react";

import { DiSqllite } from "@react-icons/all-files/di/DiSqllite";
import { SiElasticsearch } from "@react-icons/all-files/si/SiElasticsearch";
import { SiMongodb } from "@react-icons/all-files/si/SiMongodb";
import { SiMysql } from "@react-icons/all-files/si/SiMysql";
import { SiPostgresql } from "@react-icons/all-files/si/SiPostgresql";
import { SiRabbitmq } from "@react-icons/all-files/si/SiRabbitmq";
import { SiRedis } from "@react-icons/all-files/si/SiRedis";
import { open } from "@tauri-apps/plugin-dialog";
import { CheckCircle2, ChevronRight, Database, FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { cn } from "@/lib/utils.ts";

type DatabaseType =
    | "mysql"
    | "postgresql"
    | "sqlite"
    | "redis"
    | "mongodb"
    | "elasticsearch"
    | "rabbitmq";

interface FormData {
    name: string;
    type: DatabaseType;
    host: string;
    port: number;
    username: string;
    password: string;
    databaseName: string;
    sqlitePath: string;
    backupPath: string;
}

const DATABASES: {
    id: DatabaseType;
    name: string;
    icon: React.ReactNode;
    color: string;
    available: boolean;
}[] = [
    {
        id: "mysql",
        name: "MySQL",
        icon: <SiMysql className="w-5 h-5" />,
        color: "border-blue-500/40 hover:border-blue-500/80",
        available: true,
    },
    {
        id: "sqlite",
        name: "SQLite",
        icon: <DiSqllite className="w-5 h-5" />,
        color: "border-emerald-500/40 hover:border-emerald-500/80",
        available: true,
    },
    {
        id: "redis",
        name: "Redis",
        icon: <SiRedis className="w-5 h-5" />,
        color: "border-red-500/40 hover:border-red-500/80",
        available: true,
    },
    {
        id: "postgresql",
        name: "PostgreSQL",
        icon: <SiPostgresql className="w-5 h-5" />,
        color: "border-sky-500/40 hover:border-sky-500/80",
        available: false,
    },
    {
        id: "mongodb",
        name: "MongoDB",
        icon: <SiMongodb className="w-5 h-5" />,
        color: "border-green-500/40 hover:border-green-500/80",
        available: false,
    },
    {
        id: "elasticsearch",
        name: "ElasticSearch",
        icon: <SiElasticsearch className="w-5 h-5" />,
        color: "border-yellow-500/40 hover:border-yellow-500/80",
        available: false,
    },
    {
        id: "rabbitmq",
        name: "RabbitMQ",
        icon: <SiRabbitmq className="w-5 h-5" />,
        color: "border-orange-500/40 hover:border-orange-500/80",
        available: false,
    },
];

const getDefaultPort = (type: DatabaseType): number => {
    switch (type) {
        case "mysql":
            return 3306;
        case "postgresql":
            return 5432;
        case "mongodb":
            return 27017;
        case "redis":
            return 6379;
        case "elasticsearch":
            return 9200;
        case "rabbitmq":
            return 5672;
        default:
            return 0;
    }
};

export function CreateDataBaseProject({ onSuccess }: { onSuccess: (project: any) => void }) {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        type: "mysql",
        host: "localhost",
        port: 3306,
        username: "root",
        password: "",
        databaseName: "",
        sqlitePath: "",
        backupPath: "",
    });

    const update = (patch: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...patch }));

    const goNext = () => setStep((s) => s + 1);
    const goBack = () => setStep((s) => s - 1);

    const selectedDb = DATABASES.find((db) => db.id === formData.type);
    const isSelectedAvailable = selectedDb?.available ?? false;

    const selectFolder = async (setPath: (path: string) => void) => {
        const selected = await open({ directory: true, multiple: false, title: "Select Folder" });
        if (selected) setPath(selected as string);
    };

    const handleNext = () => {
        if (step === 0 && formData.name) goNext();
        else if (step === 1 && formData.type && isSelectedAvailable) {
            goNext();
        } else if (step === 2) {
            if (formData.type === "sqlite" && formData.sqlitePath) goNext();
            else if (formData.type !== "sqlite") goNext();
        } else if (step === 3) goNext();
    };

    const handleCreate = () => {
        onSuccess({
            name: formData.name,
            type: formData.type,
            path:
                formData.type === "sqlite"
                    ? formData.sqlitePath
                    : `${formData.host}:${formData.port}`,
            description: `${selectedDb?.name} database · ${formData.databaseName || formData.name}`,
        });
    };

    const handleTypeSelect = (type: DatabaseType, available: boolean) => {
        if (!available) return;
        update({
            type,
            port: getDefaultPort(type),
            host: type === "sqlite" ? "" : "localhost",
            username: type === "sqlite" ? "" : "root",
        });
        // حذف auto goNext - کاربر باید خودش دکمه Continue رو بزند
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1">
                {["Name", "Type", "Connection", "Backup"].map((label, i) => {
                    const active = i === step;
                    const done = i < step;
                    return (
                        <div key={i} className="flex items-center gap-1 flex-1 last:flex-none">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all",
                                    done
                                        ? "bg-emerald-500 text-white"
                                        : active
                                          ? "bg-amber-500 text-white"
                                          : "bg-muted text-muted-foreground"
                                )}
                            >
                                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <span
                                className={cn(
                                    "text-[11px] font-medium hidden sm:block",
                                    active ? "text-foreground" : "text-muted-foreground"
                                )}
                            >
                                {label}
                            </span>
                            {i < 3 && (
                                <div
                                    className={cn(
                                        "flex-1 h-px",
                                        done ? "bg-emerald-500/50" : "bg-border"
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {step === 0 && (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm">Database Name</Label>
                        <Input
                            autoFocus
                            placeholder="my-app-db"
                            value={formData.name}
                            onChange={(e) =>
                                update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                            }
                            className="font-mono"
                            onKeyDown={(e) => e.key === "Enter" && formData.name && goNext()}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            This will be used as the database identifier
                        </p>
                    </div>
                    <Button
                        onClick={goNext}
                        disabled={!formData.name}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                        Continue <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    <Label className="text-sm">Database Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {DATABASES.map((db) => (
                            <button
                                key={db.id}
                                onClick={() => handleTypeSelect(db.id, db.available)}
                                disabled={!db.available}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                                    !db.available && "opacity-50 cursor-not-allowed",
                                    formData.type === db.id && db.available
                                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40"
                                        : `cursor-pointer ${db.color} border-border`
                                )}
                            >
                                <div className="text-xl">{db.icon}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium">{db.name}</div>
                                    {!db.available && (
                                        <div className="text-[9px] text-muted-foreground">Soon</div>
                                    )}
                                </div>
                                {!db.available && (
                                    <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                        Soon
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-4">
                        <Button variant="outline" size="sm" onClick={goBack}>
                            Back
                        </Button>
                        <Button
                            onClick={handleNext}
                            disabled={!formData.type || !isSelectedAvailable}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    {formData.type === "sqlite" ? (
                        <div className="space-y-2">
                            <Label className="text-sm">SQLite Database File Path</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.sqlitePath}
                                    onChange={(e) => update({ sqlitePath: e.target.value })}
                                    placeholder="~/data/my-database.sqlite"
                                    className="font-mono text-xs"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        selectFolder((path) =>
                                            update({ sqlitePath: path + "/database.sqlite" })
                                        )
                                    }
                                >
                                    <FolderOpen className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                SQLite will be created as a single file
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Host</Label>
                                    <Input
                                        value={formData.host}
                                        onChange={(e) => update({ host: e.target.value })}
                                        className="font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Port</Label>
                                    <Input
                                        type="number"
                                        value={formData.port}
                                        onChange={(e) => update({ port: parseInt(e.target.value) })}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Username</Label>
                                    <Input
                                        value={formData.username}
                                        onChange={(e) => update({ username: e.target.value })}
                                        className="font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Password</Label>
                                    <Input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => update({ password: e.target.value })}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Database Name (optional)</Label>
                                <Input
                                    value={formData.databaseName}
                                    onChange={(e) => update({ databaseName: e.target.value })}
                                    placeholder="Will be created automatically"
                                    className="font-mono text-xs"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={goBack}>
                            Back
                        </Button>
                        <Button
                            onClick={handleNext}
                            disabled={formData.type === "sqlite" && !formData.sqlitePath}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            Continue <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm">Backup Location</Label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.backupPath}
                                onChange={(e) => update({ backupPath: e.target.value })}
                                placeholder="~/backups/databases"
                                className="font-mono text-xs"
                            />
                            <Button
                                variant="outline"
                                onClick={() => selectFolder((path) => update({ backupPath: path }))}
                            >
                                <FolderOpen className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Automatic backups will be stored here
                        </p>
                    </div>

                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                        <p className="text-[10px] text-zinc-500 mb-1.5 font-mono uppercase tracking-wider">
                            Summary
                        </p>
                        <div className="space-y-1 text-[11px] font-mono">
                            <p>
                                <span className="text-zinc-500">Type:</span>{" "}
                                <span className="text-emerald-400">{selectedDb?.name}</span>
                            </p>
                            {formData.type !== "sqlite" && (
                                <>
                                    <p>
                                        <span className="text-zinc-500">Host:</span> {formData.host}
                                        :{formData.port}
                                    </p>
                                    <p>
                                        <span className="text-zinc-500">User:</span>{" "}
                                        {formData.username}
                                    </p>
                                </>
                            )}
                            {formData.type === "sqlite" && (
                                <p>
                                    <span className="text-zinc-500">Path:</span>{" "}
                                    {formData.sqlitePath}
                                </p>
                            )}
                            <p>
                                <span className="text-zinc-500">Backup:</span>{" "}
                                {formData.backupPath || "Not set"}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={goBack}>
                            Back
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <Database className="w-4 h-4" />
                            Create Database
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
