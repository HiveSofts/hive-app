import { LangMeta, RuntimeVersion } from "../types/runtime.types";

const createVersion = (
    version: string,
    installed: boolean = false,
    isDefault: boolean = false
): RuntimeVersion => ({
    version,
    installed,
    isDefault,
});

export const LANGUAGES: LangMeta[] = [
    {
        id: "php",
        name: "PHP",
        icon: "🐘",
        color: "#8892BF",
        accent: "indigo",
        description: "Hypertext Preprocessor",
        versions: [
            createVersion("8.3", true, true),
            createVersion("8.2", true),
            createVersion("8.1", false),
            createVersion("8.0", false),
            createVersion("7.4", false),
        ],
        currentVersion: null,
        installed: false,
        packageManager: "Composer",
        website: "https://php.net",
    },
    {
        id: "node",
        name: "Node.js",
        icon: "⬢",
        color: "#68A063",
        accent: "green",
        description: "JavaScript Runtime",
        versions: [
            createVersion("21.x", true, true),
            createVersion("20.x LTS", true),
            createVersion("18.x LTS", false),
            createVersion("16.x", false),
        ],
        currentVersion: null,
        installed: false,
        packageManager: "npm / pnpm / yarn",
        website: "https://nodejs.org",
    },
];
