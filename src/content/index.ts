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

// Helper functions to detect if we're on an embed video (like youtube-nocookie.com)
function isEmbedVideo(): boolean {
    return window.location.pathname.startsWith('/embed/');
}


// Initialize features based on settings
async function initializeFeatures() {
    await fetchSettings();

    // Special handling for youtube-nocookie.com
    if (isEmbedVideo()) {
        coreLog('Detected embed video, using special initialization');
        
        setupEmbedVideoObserver();
        
        return;
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
let loadStartHandlerInitialized = false;

function initializeLoadStartHandler() {
    if (!loadStartHandlerInitialized && 
        (currentSettings?.audioTranslation || currentSettings?.subtitlesTranslation)) {
        setupLoadStartHandler();
        loadStartHandlerInitialized = true;
    }
}

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
        
        initializeLoadStartHandler();
    };
};

function initializeDescriptionTranslation() {
    descriptionLog('Initializing description translation prevention');
    
    //Everything is already called when needed in observer file
};

function initializeSubtitlesTranslation() {
    subtitlesLog('Initializing subtitles translation prevention');
    
    if (currentSettings?.subtitlesTranslation) {
        handleSubtitlesTranslation();
        
        initializeLoadStartHandler();
    };
};

browser.runtime.onMessage.addListener((message: unknown) => {
    if (isToggleMessage(message)) {
        switch(message.feature) {
            case 'audio':
                if (message.isEnabled) {
                    handleAudioTranslation();

                    setupLoadStartHandler();                    
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

                    setupLoadStartHandler();
                }
                break;
        }
        return true;
    }
    return true;
});


// Start initialization
initializeFeatures();