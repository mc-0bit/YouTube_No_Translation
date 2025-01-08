
async function initializeSettings() {
    const data = await browser.storage.local.get('settings');
    if (!data.settings) {
        await browser.storage.local.set({
            settings: DEFAULT_SETTINGS
        });
        console.log('[NTM-Debug] Settings initialized with default values');
    }
}

// Initialize settings when extension is installed or updated
browser.runtime.onInstalled.addListener(initializeSettings);
