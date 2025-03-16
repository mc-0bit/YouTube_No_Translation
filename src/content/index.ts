/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



coreLog('Content script starting to load...');

let currentSettings: ExtensionSettings | null = null;

// Fetch settings once and store them in currentSettings
async function fetchSettings() {
    const data = await browser.storage.local.get('settings');
    currentSettings = data.settings as ExtensionSettings;
};

// Helper function to detect if we're on youtube-nocookie.com domain
function isYoutubeNoCookie(): boolean {
    return window.location.hostname.includes('youtube-nocookie.com');
}


// Initialize features based on settings
async function initializeFeatures() {
    await fetchSettings();

    // Special handling for youtube-nocookie.com
    if (isYoutubeNoCookie()) {
        coreLog('Detected youtube-nocookie.com domain, using special initialization');
        
        setupNoCookieObserver();
        
        return; // Skip standard initialization for regular YouTube
    }
    
    if (currentSettings?.titleTranslation) {
        initializeTitleTranslation();
        setupMainTitleObserver();
        setupUrlObserver();
    }
    if (currentSettings?.audioTranslation) {
        initializeAudioTranslation();
        setupAudioObserver();
    }
    if (currentSettings?.descriptionTranslation) {
        initializeDescriptionTranslation();
        setupDescriptionObserver();
    }
    if (currentSettings?.subtitlesTranslation) {
        initializeSubtitlesTranslation();
        setupSubtitlesObserver();
    }
}

// Initialize functions
function initializeTitleTranslation() {
    titlesLog('Initializing title translation prevention');
    
    if (currentSettings?.titleTranslation) {
        refreshMainTitle();
        refreshBrowsingTitles();
    }
}

function initializeAudioTranslation() {
    audioLog('Initializing audio translation prevention');

    // Initial setup
    if (currentSettings?.audioTranslation) {
        handleAudioTranslation();
    }

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

    if (currentSettings?.descriptionTranslation) {
        refreshDescription();
    }

    browser.runtime.onMessage.addListener((message: unknown) => {
        if (isToggleMessage(message) && message.feature === 'description') {
            if (message.isEnabled) {
                refreshDescription();
            }
        }
        return true;
    });
}

function initializeSubtitlesTranslation() {
    subtitlesLog('Initializing subtitles translation prevention');

    if (currentSettings?.subtitlesTranslation) {
        handleSubtitlesTranslation();
    }

    browser.runtime.onMessage.addListener((message: unknown) => {
        if (isToggleMessage(message) && message.feature === 'subtitles') {
            if (message.isEnabled) {
                handleSubtitlesTranslation();
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


// Start initialization
initializeFeatures();