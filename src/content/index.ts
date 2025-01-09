console.log(
    '%c[NTM-Debug][Core] Content script starting to load...',
    'color: #f9a8d4; font-weight: bold;'
);

let mainVideoObserver: MutationObserver | null = null;

// Initialize features
browser.storage.local.get('settings').then((data: Record<string, any>) => {
    const settings = data.settings as ExtensionSettings;
    
    if (settings?.titleTranslation) {
        initializeTitleTranslation();
    }
    if (settings?.audioTranslation) {
        initializeAudioTranslation();
    }

    // Only setup video-id observer if at least one feature is enabled
    if (settings?.titleTranslation || settings?.audioTranslation) {
        setupVideoIdObserver();
    }
});

// Listen for toggle changes
browser.runtime.onMessage.addListener((message: unknown) => {
    if (isToggleMessage(message)) {
        // Check if both features are now disabled
        browser.storage.local.get('settings').then((data: Record<string, any>) => {
            const settings = data.settings as ExtensionSettings;
            
            if (!settings?.titleTranslation && !settings?.audioTranslation) {
                // Cleanup main observer when all features are disabled
                if (mainVideoObserver) {
                    mainVideoObserver.disconnect();
                    mainVideoObserver = null;
                }
            } else if (!mainVideoObserver) {
                // Setup observer if it doesn't exist and at least one feature is enabled
                setupVideoIdObserver();
            }
        });
    }
    return true;
});

function setupVideoIdObserver() {
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        mainVideoObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    // Check current state before refreshing features
                    browser.storage.local.get('settings').then((data: Record<string, any>) => {
                        const settings = data.settings as ExtensionSettings;
                        
                        if (settings?.titleTranslation) {
                            refreshTitleTranslation();
                        }
                        if (settings?.audioTranslation) {
                            initializeAudioTranslation();
                        }
                    });
                }
            }
        });

        // Only observe video-id attribute changes
        mainVideoObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });
}

// Function to wait for an element to be present in the DOM
function waitForElement(selector: string, timeout = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector)!);
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector)!);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject('Timeout waiting for element');
        }, timeout);
    });
}
