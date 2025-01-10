
console.log(
    '%c[NTM-Debug][Core] Content script starting to load...',
    'color: #f9a8d4; font-weight: bold;'
);

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
});

// Listen for toggle changes
browser.runtime.onMessage.addListener((message: unknown) => {
    if (isToggleMessage(message)) {
        return true;
    }
    return true;
});
