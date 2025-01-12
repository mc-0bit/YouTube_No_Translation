
coreLog('Content script starting to load...');

// Initialize features
browser.storage.local.get('settings').then((data: Record<string, any>) => {
    const settings = data.settings as ExtensionSettings;
    
    if (settings?.titleTranslation) {
        initializeTitleTranslation();
        setupTitleObserver();
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

// Listen for toggle changes
browser.runtime.onMessage.addListener((message: unknown) => {
    if (isToggleMessage(message)) {
        return true;
    }
    return true;
});
