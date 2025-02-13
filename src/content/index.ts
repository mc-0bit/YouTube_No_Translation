/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



coreLog('Content script starting to load...');

// Initialize features
browser.storage.local.get('settings').then((data: Record<string, any>) => {
    const settings = data.settings as ExtensionSettings;
    
    if (settings?.titleTranslation) {
        initializeTitleTranslation();
        setupMainTitleObserver();
        setupOtherTitlesObserver();
        setupUrlObserver();
    }
    if (settings?.audioTranslation) {
        initializeAudioTranslation();
        setupAudioObserver();
    }
    if (settings?.descriptionTranslation) {
        initializeDescriptionTranslation();
        setupDescriptionObserver();
    }
});

// Initialization
function initializeTitleTranslation() {
    browser.storage.local.get('settings').then((data: Record<string, any>) => {
        const settings = data.settings as ExtensionSettings;
        if (settings?.titleTranslation) {
            refreshMainTitle();
            refreshOtherTitles();
        }
    });
}

function initializeAudioTranslation() {
    audioLog('Initializing audio translation prevention');

    // Initial setup
    browser.storage.local.get('settings').then((data: Record<string, any>) => {
        const settings = data.settings as ExtensionSettings;
        handleAudioTranslation();
    });

    // Message handler
    browser.runtime.onMessage.addListener((message: unknown) => {
        if (isToggleMessage(message) && message.feature === 'audio') {
            handleAudioTranslation();
        }
        return true;
    });
}

function initializeDescriptionTranslation() {
    descriptionLog('Initializing description translation prevention');

    browser.storage.local.get('settings').then((data: Record<string, any>) => {
        const settings = data.settings as ExtensionSettings;
        if (settings?.descriptionTranslation) {
            refreshDescription();
        }
    });

    browser.runtime.onMessage.addListener((message: unknown) => {
        if (isToggleMessage(message) && message.feature === 'description') {
            if (message.isEnabled) {
                refreshDescription();
            }
        }
        return true;
    });
}

// Listen for toggle changes
browser.runtime.onMessage.addListener((message: unknown) => {
    if (isToggleMessage(message)) {
        return true;
    }
    return true;
});
