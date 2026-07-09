import { EnvVar } from "../types/runtime.types";

export const GO_ENV_VARS: EnvVar[] = [
    { key: "GOPATH", value: "~/go", description: "Go workspace path" },
    { key: "GOROOT", value: "/usr/local/go", description: "Go installation directory" },
    { key: "GOPROXY", value: "https://proxy.golang.org,direct", description: "Module proxy URL" },
    { key: "GONOSUMCHECK", value: "", description: "No sum check patterns" },
    { key: "GOFLAGS", value: "", description: "Default go command flags" },
    { key: "CGO_ENABLED", value: "1", description: "Enable CGO" },
    { key: "GOARCH", value: "amd64", description: "Target architecture" },
    { key: "GOOS", value: "linux", description: "Target operating system" },
];