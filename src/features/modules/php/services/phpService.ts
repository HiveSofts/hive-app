import { Extension, IniSetting, PhpVersion, Project } from "../types";

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
    },
];

export const MOCK_PROJECTS: Project[] = [
    { id: 1, name: "my-blog", type: "laravel", phpVersion: null },
    { id: 2, name: "dashboard-app", type: "react", phpVersion: "8.2" },
    { id: 3, name: "api-gateway", type: "nextjs", phpVersion: null },
    { id: 4, name: "shop-backend", type: "php", phpVersion: "8.2" },
];

export const INI_SETTINGS: IniSetting[] = [
    {
        key: "memory_limit",
        value: "256M",
        type: "text",
        description: "Max memory per script",
        group: "Resource Limits",
    },
    {
        key: "max_execution_time",
        value: "30",
        type: "text",
        description: "Max execution time (seconds)",
        group: "Resource Limits",
    },
    {
        key: "max_input_time",
        value: "60",
        type: "text",
        description: "Max input parsing time (seconds)",
        group: "Resource Limits",
    },
    {
        key: "post_max_size",
        value: "8M",
        type: "text",
        description: "Max POST body size",
        group: "Uploads",
    },
    {
        key: "upload_max_filesize",
        value: "2M",
        type: "text",
        description: "Max single file upload size",
        group: "Uploads",
    },
    {
        key: "max_file_uploads",
        value: "20",
        type: "text",
        description: "Max simultaneous file uploads",
        group: "Uploads",
    },
    {
        key: "display_errors",
        value: "On",
        type: "toggle",
        description: "Show errors in browser output",
        group: "Error Handling",
    },
    {
        key: "error_reporting",
        value: "E_ALL",
        type: "select",
        options: ["E_ALL", "E_ALL & ~E_DEPRECATED", "E_ERROR | E_WARNING", "0"],
        description: "Error reporting level",
        group: "Error Handling",
    },
    {
        key: "log_errors",
        value: "On",
        type: "toggle",
        description: "Log errors to file",
        group: "Error Handling",
    },
    {
        key: "date.timezone",
        value: "UTC",
        type: "select",
        options: ["UTC", "Asia/Tehran", "America/New_York", "Europe/London", "Asia/Tokyo"],
        description: "Default timezone",
        group: "General",
    },
    {
        key: "opcache.enable",
        value: "1",
        type: "toggle",
        description: "Enable OPcache bytecode cache",
        group: "OPcache",
    },
    {
        key: "opcache.memory_consumption",
        value: "128",
        type: "text",
        description: "OPcache memory (MB)",
        group: "OPcache",
    },
    {
        key: "opcache.validate_timestamps",
        value: "1",
        type: "toggle",
        description: "Revalidate cached files",
        group: "OPcache",
    },
];

export const PRESETS: Record<string, Partial<Record<string, string>>> = {
    development: {
        memory_limit: "512M",
        max_execution_time: "120",
        display_errors: "On",
        "opcache.enable": "0",
        "opcache.validate_timestamps": "1",
    },
    production: {
        memory_limit: "256M",
        max_execution_time: "30",
        display_errors: "Off",
        "opcache.enable": "1",
        "opcache.validate_timestamps": "0",
    },
    laravel: {
        memory_limit: "1G",
        max_execution_time: "60",
        display_errors: "Off",
        "opcache.enable": "1",
        "opcache.memory_consumption": "256",
        post_max_size: "64M",
        upload_max_filesize: "64M",
    },
    wordpress: {
        memory_limit: "512M",
        max_execution_time: "60",
        upload_max_filesize: "64M",
        post_max_size: "64M",
        "opcache.enable": "1",
    },
};

export const MOCK_EXTENSIONS: Extension[] = [
    { name: "curl", enabled: true, builtin: false },
    { name: "json", enabled: true, builtin: true },
    { name: "mbstring", enabled: true, builtin: false },
    { name: "openssl", enabled: true, builtin: false },
    { name: "pdo", enabled: true, builtin: true },
    { name: "pdo_mysql", enabled: true, builtin: false },
    { name: "pdo_sqlite", enabled: true, builtin: false },
    { name: "zip", enabled: true, builtin: false },
    { name: "gd", enabled: false, builtin: false },
    { name: "imagick", enabled: false, builtin: false },
    { name: "redis", enabled: false, builtin: false },
    { name: "xdebug", enabled: false, builtin: false },
    { name: "sodium", enabled: true, builtin: true },
    { name: "intl", enabled: false, builtin: false },
    { name: "opcache", enabled: true, builtin: false },
    { name: "fileinfo", enabled: true, builtin: true },
];

export const getVersions = () => AVAILABLE_VERSIONS;
export const getProjects = () => MOCK_PROJECTS;
export const getIniSettings = () => INI_SETTINGS;
export const getPresets = () => PRESETS;
export const getExtensions = () => MOCK_EXTENSIONS;
