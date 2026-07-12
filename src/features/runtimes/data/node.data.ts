import { EnvVar } from "../types/runtime.types";

export const NODE_ENV_VARS: EnvVar[] = [
    { key: "NODE_ENV", value: "development", description: "Runtime environment" },
    { key: "NODE_OPTIONS", value: "--max-old-space-size=4096", description: "V8 engine options" },
    {
        key: "NPM_CONFIG_REGISTRY",
        value: "https://registry.npmjs.org/",
        description: "npm registry URL",
    },
    { key: "NODE_PATH", value: "", description: "Additional module paths" },
    { key: "UV_THREADPOOL_SIZE", value: "4", description: "libuv thread pool size" },
];
