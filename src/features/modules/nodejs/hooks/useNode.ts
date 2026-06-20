import { useCallback, useState } from "react";

import { getVersions } from "../services/nodeService";
import { NodeVersion } from "../types";

export function useNode() {
    const [versions, setVersions] = useState<NodeVersion[]>(() => getVersions());

    const handleInstall = useCallback((id: string) => {
        setVersions((prev) =>
            prev.map((v) => (v.id === id ? { ...v, state: "installing", progress: 0 } : v))
        );

        let prog = 0;
        const interval = setInterval(() => {
            prog += Math.round(5 + Math.random() * 10);
            if (prog >= 100) {
                clearInterval(interval);
                setVersions((prev) =>
                    prev.map((v) =>
                        v.id === id
                            ? {
                                  ...v,
                                  state: "installed",
                                  progress: undefined,
                                  installedAt: new Date().toISOString().slice(0, 10),
                              }
                            : v
                    )
                );
            } else {
                setVersions((prev) =>
                    prev.map((v) => (v.id === id ? { ...v, progress: Math.min(prog, 99) } : v))
                );
            }
        }, 300);
    }, []);

    const handleSetDefault = useCallback((id: string) => {
        setVersions((prev) => prev.map((v) => ({ ...v, isDefault: v.id === id })));
    }, []);

    const handleRemove = useCallback((id: string) => {
        setVersions((prev) =>
            prev.map((v) =>
                v.id === id
                    ? { ...v, state: "not-installed", installedAt: "", isDefault: false }
                    : v
            )
        );
    }, []);

    const defaultVersion = versions.find((v) => v.isDefault)?.major ?? "20";
    const installedVersions = versions.filter((v) => v.state === "installed");

    return {
        versions,
        defaultVersion,
        installedVersions,
        handleInstall,
        handleSetDefault,
        handleRemove,
        setVersions,
    };
}
