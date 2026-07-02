import { Extension, IniSetting, PhpVersion, Project, ShellAlias } from "../types";

export const AVAILABLE_VERSIONS: PhpVersion[] = [
    {
        id: "8.4",
        minor: "8.4",
        patch: "8.4.1",
        full: "PHP 8.4.1",
        installPath: "~/.hive/php/8.4",
        installedAt: "",
        state: "not-installed",
        isDefault: false,
        downloadSize: "~27 MB",
        alias: "php84",
        releaseDate: "Nov 2024",
        eol: false,
    },
    {
        id: "8.3",
        minor: "8.3",
        patch: "8.3.14",
        full: "PHP 8.3.14",
        installPath: "~/.hive/php/8.3",
        installedAt: "2024-12-01",
        state: "installed",
        isDefault: true,
        downloadSize: "~26 MB",
        alias: "php83",
        releaseDate: "Nov 2023",
        eol: false,
    },
    {
        id: "8.2",
        minor: "8.2",
        patch: "8.2.26",
        full: "PHP 8.2.26",
        installPath: "~/.hive/php/8.2",
        installedAt: "2024-09-15",
        state: "installed",
        isDefault: false,
        downloadSize: "~25 MB",
        alias: "php82",
        releaseDate: "Dec 2022",
        eol: false,
    },
    {
        id: "8.1",
        minor: "8.1",
        patch: "8.1.31",
        full: "PHP 8.1.31",
        installPath: "~/.hive/php/8.1",
        installedAt: "",
        state: "not-installed",
        isDefault: false,
        downloadSize: "~24 MB",
        alias: "php81",
        releaseDate: "Nov 2021",
        eol: true,
    },
];

export const MOCK_PROJECTS: Project[] = [
    { id: 1, name: "my-blog", type: "laravel", phpVersion: null, path: "~/Projects/my-blog" },
    { id: 2, name: "dashboard-app", type: "react", phpVersion: "8.2", path: "~/Projects/dashboard-app" },
    { id: 3, name: "api-gateway", type: "nextjs", phpVersion: null, path: "~/Projects/api-gateway" },
    { id: 4, name: "shop-backend", type: "php", phpVersion: "8.2", path: "~/Projects/shop-backend" },
];

export const INI_SETTINGS: IniSetting[] = [
    { key: "memory_limit", value: "256M", type: "text", description: "Max memory per script", group: "Resource Limits" },
    { key: "max_execution_time", value: "30", type: "text", description: "Max execution time (seconds)", group: "Resource Limits" },
    { key: "max_input_time", value: "60", type: "text", description: "Max input parsing time (seconds)", group: "Resource Limits" },
    { key: "post_max_size", value: "8M", type: "text", description: "Max POST body size", group: "Uploads" },
    { key: "upload_max_filesize", value: "2M", type: "text", description: "Max single file upload size", group: "Uploads" },
    { key: "max_file_uploads", value: "20", type: "text", description: "Max simultaneous file uploads", group: "Uploads" },
    { key: "display_errors", value: "On", type: "toggle", description: "Show errors in browser output", group: "Error Handling" },
    { key: "error_reporting", value: "E_ALL", type: "select", options: ["E_ALL", "E_ALL & ~E_DEPRECATED", "E_ERROR | E_WARNING", "0"], description: "Error reporting level", group: "Error Handling" },
    { key: "log_errors", value: "On", type: "toggle", description: "Log errors to file", group: "Error Handling" },
    { key: "date.timezone", value: "UTC", type: "select", options: ["UTC", "Asia/Tehran", "America/New_York", "Europe/London", "Asia/Tokyo"], description: "Default timezone", group: "General" },
    { key: "opcache.enable", value: "1", type: "toggle", description: "Enable OPcache bytecode cache", group: "OPcache" },
    { key: "opcache.memory_consumption", value: "128", type: "text", description: "OPcache memory (MB)", group: "OPcache" },
    { key: "opcache.validate_timestamps", value: "1", type: "toggle", description: "Revalidate cached files", group: "OPcache" },
];

export const PRESETS: Record<string, Partial<Record<string, string>>> = {
    development: { memory_limit: "512M", max_execution_time: "120", display_errors: "On", "opcache.enable": "0", "opcache.validate_timestamps": "1" },
    production: { memory_limit: "256M", max_execution_time: "30", display_errors: "Off", "opcache.enable": "1", "opcache.validate_timestamps": "0" },
    laravel: { memory_limit: "1G", max_execution_time: "60", display_errors: "Off", "opcache.enable": "1", "opcache.memory_consumption": "256", post_max_size: "64M", upload_max_filesize: "64M" },
    wordpress: { memory_limit: "512M", max_execution_time: "60", upload_max_filesize: "64M", post_max_size: "64M", "opcache.enable": "1" },
};

export const MOCK_EXTENSIONS: Extension[] = [
    { name: "curl", enabled: true, builtin: false, description: "URL transfer library", category: "Network" },
    { name: "json", enabled: true, builtin: true, description: "JSON encode/decode", category: "Data" },
    { name: "mbstring", enabled: true, builtin: false, description: "Multibyte string functions", category: "String" },
    { name: "openssl", enabled: true, builtin: false, description: "OpenSSL encryption", category: "Security" },
    { name: "pdo", enabled: true, builtin: true, description: "PHP Data Objects", category: "Database" },
    { name: "pdo_mysql", enabled: true, builtin: false, description: "MySQL PDO driver", category: "Database" },
    { name: "pdo_sqlite", enabled: true, builtin: false, description: "SQLite PDO driver", category: "Database" },
    { name: "zip", enabled: true, builtin: false, description: "ZIP archive support", category: "Files" },
    { name: "gd", enabled: false, builtin: false, description: "Image processing", category: "Media" },
    { name: "imagick", enabled: false, builtin: false, description: "ImageMagick binding", category: "Media" },
    { name: "redis", enabled: false, builtin: false, description: "Redis cache driver", category: "Cache" },
    { name: "xdebug", enabled: false, builtin: false, description: "Debugging & profiling", category: "Dev" },
    { name: "sodium", enabled: true, builtin: true, description: "Modern cryptography", category: "Security" },
    { name: "intl", enabled: false, builtin: false, description: "Internationalization", category: "String" },
    { name: "opcache", enabled: true, builtin: false, description: "Bytecode caching", category: "Performance" },
    { name: "fileinfo", enabled: true, builtin: true, description: "File type detection", category: "Files" },
];

export function generateShellAliases(versions: PhpVersion[]): ShellAlias[] {
    return versions
        .filter((v) => v.state === "installed")
        .map((v) => ({
            alias: `php${v.minor.replace(".", "")}`,
            version: v.minor,
            command: `~/.hive/php/${v.minor}/bin/php`,
            isActive: v.isDefault,
        }));
}

export function generateBashConfig(versions: PhpVersion[]): string {
    const installed = versions.filter((v) => v.state === "installed");
    const defaultVer = versions.find((v) => v.isDefault);

    const lines: string[] = [
        `# ─── Hive PHP Manager ────────────────────────────────────────`,
        `# Auto-generated by Hive. Do not edit manually.`,
        ``,
        `export HIVE_PHP_DIR="$HOME/.hive/php"`,
        `export HIVE_BIN_DIR="$HOME/.hive/bin"`,
        ``,
        `# Version aliases`,
        ...installed.map(
            (v) =>
                `alias php${v.minor.replace(".", "")}='$HIVE_PHP_DIR/${v.minor}/bin/php'`
        ),
        ``,
        `# Composer with version aliases`,
        ...installed.map(
            (v) =>
                `alias composer${v.minor.replace(".", "")}='PHP_BINARY=$HIVE_PHP_DIR/${v.minor}/bin/php $HIVE_BIN_DIR/composer'`
        ),
        ``,
        `# Switch default PHP`,
        `hive-php-use() {`,
        `  local ver="$1"`,
        `  if [ -z "$ver" ]; then`,
        `    echo "Usage: hive-php-use <version> (e.g. 8.3)"`,
        `    return 1`,
        `  fi`,
        `  local bin="$HIVE_PHP_DIR/$ver/bin/php"`,
        `  if [ ! -f "$bin" ]; then`,
        `    echo "PHP $ver not installed. Run: hive install php $ver"`,
        `    return 1`,
        `  fi`,
        `  ln -sf "$bin" "$HIVE_BIN_DIR/php"`,
        `  echo "✓ Default PHP switched to $ver"`,
        `  php -v | head -1`,
        `}`,
        ``,
        `# List installed versions`,
        `hive-php-list() {`,
        `  echo "Installed PHP versions:"`,
        ...installed.map(
            (v) =>
                `  echo "  php${v.minor.replace(".", "")}  →  PHP ${v.patch}  (${v.isDefault ? "default" : v.installPath})"`
        ),
        `}`,
        ``,
        defaultVer
            ? `# Add Hive bin to PATH\nexport PATH="$HIVE_BIN_DIR:$PATH"`
            : "",
        `# ─────────────────────────────────────────────────────────────`,
    ];

    return lines.join("\n");
}

export function generateZshConfig(versions: PhpVersion[]): string {
    return generateBashConfig(versions).replace(
        `# ─── Hive PHP Manager`,
        `# ─── Hive PHP Manager`
    );
}

export function generateFishConfig(versions: PhpVersion[]): string {
    const installed = versions.filter((v) => v.state === "installed");
    const defaultVer = versions.find((v) => v.isDefault);

    const lines: string[] = [
        `# ─── Hive PHP Manager (fish) ─────────────────────────────────`,
        ``,
        `set -x HIVE_PHP_DIR $HOME/.hive/php`,
        `set -x HIVE_BIN_DIR $HOME/.hive/bin`,
        ``,
        ...installed.map(
            (v) =>
                `alias php${v.minor.replace(".", "")}='$HIVE_PHP_DIR/${v.minor}/bin/php'`
        ),
        ``,
        ...installed.map(
            (v) =>
                `alias composer${v.minor.replace(".", "")}='PHP_BINARY=$HIVE_PHP_DIR/${v.minor}/bin/php $HIVE_BIN_DIR/composer'`
        ),
        ``,
        `function hive-php-use`,
        `  set ver $argv[1]`,
        `  ln -sf $HIVE_PHP_DIR/$ver/bin/php $HIVE_BIN_DIR/php`,
        `  echo "✓ Default PHP switched to $ver"`,
        `end`,
        ``,
        defaultVer ? `fish_add_path $HIVE_BIN_DIR` : "",
        `# ─────────────────────────────────────────────────────────────`,
    ];

    return lines.join("\n");
}

export const getVersions = () => AVAILABLE_VERSIONS;
export const getProjects = () => MOCK_PROJECTS;
export const getIniSettings = () => INI_SETTINGS;
export const getPresets = () => PRESETS;
export const getExtensions = () => MOCK_EXTENSIONS;