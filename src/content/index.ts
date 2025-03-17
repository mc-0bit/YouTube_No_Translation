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
    
    setupUrlObserver();
    
    if (currentSettings?.titleTranslation) {
        initializeTitleTranslation();
    }
    if (currentSettings?.audioTranslation) {
        initializeAudioTranslation();
    }
    if (currentSettings?.descriptionTranslation) {
        initializeDescriptionTranslation();
    }
    if (currentSettings?.subtitlesTranslation) {
        initializeSubtitlesTranslation();
    }
}

// Initialize functions
function initializeTitleTranslation() {
    titlesLog('Initializing title translation prevention');
    
    if (currentSettings?.titleTranslation) {
        refreshMainTitle();
        refreshBrowsingTitles();
        
        setupMainTitleObserver();
    }
}

function initializeAudioTranslation() {
    audioLog('Initializing audio translation prevention');
    
    // Initial setup
    if (currentSettings?.audioTranslation) {
        handleAudioTranslation();
        
        setupAudioObserver();
    };
};

function initializeDescriptionTranslation() {
    descriptionLog('Initializing description translation prevention');
    
    if (currentSettings?.descriptionTranslation) {
        refreshDescription();
        
        setupDescriptionObserver();
    };
};

function initializeSubtitlesTranslation() {
    subtitlesLog('Initializing subtitles translation prevention');
    
    if (currentSettings?.subtitlesTranslation) {
        handleSubtitlesTranslation();
        
        setupSubtitlesObserver();
    };
};

browser.runtime.onMessage.addListener((message: unknown) => {
    if (isToggleMessage(message)) {
        switch(message.feature) {
            case 'audio':
                if (message.isEnabled) {
                    handleAudioTranslation();
                    
                    setupAudioObserver();
                }
                break;
            case 'titles':
                if (message.isEnabled) {
                    refreshMainTitle();
                    refreshBrowsingTitles();
                    refreshShortsAlternativeFormat();
                    
                    setupMainTitleObserver();
                }
                break;
            case 'description':
                if (message.isEnabled) {
                    refreshDescription();

                    setupDescriptionObserver();
                }
                break;
            case 'subtitles':
                if (message.isEnabled) {
                    handleSubtitlesTranslation();

                    setupSubtitlesObserver();
                }
                break;
        }
        return true;
    }
    return true;
});


// Start initialization
initializeFeatures();