import { check } from "@tauri-apps/plugin-updater";

export const checkForUpdates = async () => {
    try {
        const update = await check();
        if (update) {
            console.log(`Update available: ${update.version}`);
            return update;
        }
        return null;
    } catch (error) {
        console.error("Failed to check updates:", error);
        return null;
    }
};

export const installUpdate = async (update: any) => {
    try {
        await update.downloadAndInstall();
        return true;
    } catch (error) {
        console.error("Failed to install update:", error);
        return false;
    }
};
