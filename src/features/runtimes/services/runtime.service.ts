import { invoke } from "@tauri-apps/api/core";

import {
    ComposerPackage,
    Extension,
    PhpExtensionToggleResult,
    PhpInfo,
    PhpIniFileInfo,
    PhpIniSetting,
    PhpVersionInfo,
} from "../types/runtime.types";

export class RuntimeService {
    async getPhpInfo(projectPath: string = ""): Promise<PhpInfo> {
        try {
            return await invoke<PhpInfo>("get_php_info", { projectPath });
        } catch (error) {
            console.error("getPhpInfo error:", error);
            throw new Error("PHP is not installed or not found in PATH");
        }
    }

    async getPhpVersionInfo(): Promise<PhpVersionInfo> {
        try {
            return await invoke<PhpVersionInfo>("get_php_version_info");
        } catch (error) {
            console.error("getPhpVersionInfo error:", error);
            throw new Error("PHP is not installed or not found in PATH");
        }
    }

    async executeCommand(command: string, cwd: string = "/tmp"): Promise<string> {
        try {
            return await invoke<string>("execute_shell_command", { command, cwd });
        } catch (error) {
            console.error("executeCommand error:", error);
            throw new Error(`Failed to execute command: ${command}`);
        }
    }

    private escapeForDoubleQuotedShell(input: string): string {
        return input
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/`/g, "\\`")
            .replace(/\$/g, "\\$");
    }

    private assertSafePackageSpec(spec: string): void {
        if (!/^[A-Za-z0-9_./:@^~<>=*,\s-]+$/.test(spec)) {
            throw new Error(`Invalid package specifier: ${spec}`);
        }
    }

    async executePhpCode(code: string): Promise<string> {
        try {
            const escaped = this.escapeForDoubleQuotedShell(code);
            return await this.executeCommand(`php -r "${escaped}"`);
        } catch (error) {
            console.error("executePhpCode error:", error);
            throw new Error("Failed to execute PHP code");
        }
    }

    async togglePhpExtension(
        extensionName: string,
        enable: boolean
    ): Promise<PhpExtensionToggleResult> {
        try {
            return await invoke<PhpExtensionToggleResult>("toggle_php_extension", {
                extensionName,
                enable,
            });
        } catch (error) {
            console.error("togglePhpExtension error:", error);
            return {
                success: false,
                message: `Failed to ${enable ? "enable" : "disable"} ${extensionName}`,
                requiresRestart: false,
            };
        }
    }

    async getPhpIniSettings(): Promise<PhpIniSetting[]> {
        try {
            return await invoke<PhpIniSetting[]>("get_php_ini_settings");
        } catch (error) {
            console.error("getPhpIniSettings error:", error);
            return [];
        }
    }

    async getPhpIniPath(): Promise<string> {
        try {
            return await invoke<string>("get_php_ini_path");
        } catch (error) {
            console.error("getPhpIniPath error:", error);
            return "/etc/php/php.ini";
        }
    }

    async getPhpIniContent(): Promise<string> {
        try {
            return await invoke<string>("get_php_ini_content");
        } catch (error) {
            console.error("getPhpIniContent error:", error);
            return "; php.ini content not available";
        }
    }

    async savePhpIniContent(content: string): Promise<void> {
        try {
            await invoke<void>("save_php_ini_content", { content });
        } catch (error) {
            console.error("savePhpIniContent error:", error);
            throw new Error("Failed to save php.ini content");
        }
    }

    async updatePhpIniSetting(key: string, value: string): Promise<void> {
        try {
            await invoke<void>("update_php_ini_setting", { key, value });
        } catch (error) {
            console.error("updatePhpIniSetting error:", error);
            throw new Error(`Failed to update ${key}`);
        }
    }

    async restartPhp(): Promise<string> {
        try {
            let serviceName = "php-fpm";
            try {
                const info = await this.getPhpVersionInfo();
                const match = info.version?.match(/(\d+\.\d+)/);
                if (match) {
                    serviceName = `php${match[1]}-fpm`;
                }
            } catch {
                // ignore: fall back to the generic php-fpm service name
            }
            return await this.executeCommand(
                `sudo systemctl restart ${serviceName} || ` +
                    `sudo service ${serviceName} restart || ` +
                    `sudo systemctl restart php-fpm || ` +
                    `sudo service php-fpm restart || ` +
                    `echo 'Please restart PHP manually'`
            );
        } catch (error) {
            console.error("restartPhp error:", error);
            return "Please restart PHP manually";
        }
    }

    async getInstalledPackages(projectPath: string): Promise<ComposerPackage[]> {
        try {
            return await invoke<ComposerPackage[]>("get_installed_packages", { projectPath });
        } catch (error) {
            console.error("getInstalledPackages error:", error);
            return [];
        }
    }

    async searchPackages(query: string, projectPath?: string): Promise<ComposerPackage[]> {
        try {
            return await invoke<ComposerPackage[]>("search_packages", { query, projectPath });
        } catch (error) {
            console.error("searchPackages error:", error);
            return [];
        }
    }

    async composerInstall(projectPath: string, packages?: string[]): Promise<string> {
        try {
            let args: string;
            if (packages && packages.length > 0) {
                packages.forEach((pkg) => this.assertSafePackageSpec(pkg));
                args = `require ${packages.join(" ")}`;
            } else {
                args = "install";
            }
            return await this.executeCommand(
                `composer ${args} --no-interaction --no-progress`,
                projectPath
            );
        } catch (error) {
            console.error("composerInstall error:", error);
            throw new Error("Failed to install packages");
        }
    }

    async composerRemove(projectPath: string, packageName: string): Promise<string> {
        try {
            this.assertSafePackageSpec(packageName);
            return await this.executeCommand(
                `composer remove ${packageName} --no-interaction --no-progress`,
                projectPath
            );
        } catch (error) {
            console.error("composerRemove error:", error);
            throw new Error(`Failed to remove ${packageName}`);
        }
    }

    async composerUpdate(projectPath: string, packageName?: string): Promise<string> {
        try {
            let args: string;
            if (packageName) {
                this.assertSafePackageSpec(packageName);
                args = `update ${packageName}`;
            } else {
                args = "update";
            }
            return await this.executeCommand(
                `composer ${args} --no-interaction --no-progress`,
                projectPath
            );
        } catch (error) {
            console.error("composerUpdate error:", error);
            throw new Error("Failed to update packages");
        }
    }

    async getPhpIniFileInfo(): Promise<PhpIniFileInfo> {
        try {
            return await invoke<PhpIniFileInfo>("get_php_ini_file_info");
        } catch (error) {
            console.error("getPhpIniFileInfo error:", error);
            return {
                path: "/etc/php/php.ini",
                content: "",
                isWritable: false,
            };
        }
    }

    async validatePhpIniContent(content: string): Promise<{ valid: boolean; errors: string[] }> {
        try {
            return await invoke<{ valid: boolean; errors: string[] }>("validate_php_ini_content", {
                content,
            });
        } catch (error) {
            console.error("validatePhpIniContent error:", error);
            return { valid: false, errors: ["Failed to validate php.ini"] };
        }
    }

    async getPhpExtensions(): Promise<Extension[]> {
        try {
            return await invoke<Extension[]>("get_php_extensions");
        } catch (error) {
            console.error("getPhpExtensions error:", error);
            return [];
        }
    }

    async getPhpVersion(): Promise<string> {
        try {
            return await invoke<string>("get_php_version");
        } catch (error) {
            console.error("getPhpVersion error:", error);
            return "Unknown";
        }
    }
}

export const runtimeService = new RuntimeService();
