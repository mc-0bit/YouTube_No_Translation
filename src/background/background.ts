/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



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
