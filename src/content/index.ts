console.log(
    '%c[NTM-Debug][Core] Content script starting to load...',
    'color: #f9a8d4; font-weight: bold;'
);

// Wait for ytd-watch-flexy to load then observe video-id changes
waitForElement('ytd-watch-flexy').then((watchFlexy) => {
    // Observe attribute changes on ytd-watch-flexy
    const videoObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                console.log(
                    '%c[NTM-Debug][Core] Video ID changed, reinitializing features...',
                    'color: #f9a8d4; font-weight: bold;'
                );
                
                // Refresh features with current state
                refreshTitleTranslation();
                refreshAudioTranslation();
            }
        }
    });

    // Only observe video-id attribute changes
    videoObserver.observe(watchFlexy, {
        attributes: true,
        attributeFilter: ['video-id']
    });
});

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

// Initialize features
initializeTitleTranslation();
initializeAudioTranslation();
