import { invoke } from "@tauri-apps/api/core";
import { 
    PhpInfo, 
    ComposerPackage, 
    PhpIniSetting, 
    PhpIniFileInfo,
    PhpExtensionToggleResult,
    PhpVersionInfo,
    Extension
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

    async executePhpCode(code: string): Promise<string> {
        try {
            const escaped = code.replace(/"/g, '\\"');
            return await this.executeCommand(`php -r "${escaped}"`);
        } catch (error) {
            console.error("executePhpCode error:", error);
            throw new Error("Failed to execute PHP code");
        }
    }

    async togglePhpExtension(extensionName: string, enable: boolean): Promise<PhpExtensionToggleResult> {
        try {
            return await invoke<PhpExtensionToggleResult>("toggle_php_extension", { extensionName, enable });
        } catch (error) {
            console.error("togglePhpExtension error:", error);
            return {
                success: false,
                message: `Failed to ${enable ? 'enable' : 'disable'} ${extensionName}`,
                requiresRestart: false
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
            return await this.executeCommand(
                "sudo systemctl restart php8.5-fpm || " +
                "sudo service php8.5-fpm restart || " +
                "sudo systemctl restart php-fpm || " +
                "sudo systemctl restart php8.5-fpm || " +
                "sudo systemctl restart php8.5-fpm.service || " +
                "echo 'Please restart PHP manually'"
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
            const args = packages ? `require ${packages.join(" ")}` : "install";
            return await this.executeCommand(`composer ${args} --no-interaction --no-progress`, projectPath);
        } catch (error) {
            console.error("composerInstall error:", error);
            throw new Error("Failed to install packages");
        }
    }

    async composerRemove(projectPath: string, packageName: string): Promise<string> {
        try {
            return await this.executeCommand(`composer remove ${packageName} --no-interaction --no-progress`, projectPath);
        } catch (error) {
            console.error("composerRemove error:", error);
            throw new Error(`Failed to remove ${packageName}`);
        }
    }

    async composerUpdate(projectPath: string, packageName?: string): Promise<string> {
        try {
            const args = packageName ? `update ${packageName}` : "update";
            return await this.executeCommand(`composer ${args} --no-interaction --no-progress`, projectPath);
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
                isWritable: false
            };
        }
    }

    async validatePhpIniContent(content: string): Promise<{ valid: boolean; errors: string[] }> {
        try {
            return await invoke<{ valid: boolean; errors: string[] }>("validate_php_ini_content", { content });
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