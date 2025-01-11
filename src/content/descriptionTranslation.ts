/**
 * NOTE ON SCRIPT INJECTION :
 * We use script injection to access YouTube's description data directly from the page context.
 * This is necessary because ytInitialPlayerResponse is not accessible from the content script context.
 * As you can see down below, the injected code only reads YouTube's data without any modifications.
 */

const DESCRIPTION_LOG_STYLE = 'color: #fca5a5;';
const DESCRIPTION_LOG_CONTEXT = '[Description]';

function descriptionLog(message: string, ...args: any[]) {
    const formattedMessage = `${LOG_PREFIX}${DESCRIPTION_LOG_CONTEXT} ${message}`;
    console.log(`%c${formattedMessage}`, DESCRIPTION_LOG_STYLE, ...args);
}

const DESCRIPTION_SCRIPT = `
(function() {
    const style = '${DESCRIPTION_LOG_STYLE};';
    const prefix = '${LOG_PREFIX}${DESCRIPTION_LOG_CONTEXT}';
    
    console.log('%c' + prefix + ' Injected script starting', style);
    
    // Get description immediately
    const description = window.ytInitialPlayerResponse?.videoDetails?.shortDescription;
    
    // Send it back to content script
    window.dispatchEvent(new CustomEvent('nmt-description-data', {
        detail: { description }
    }));
})();
`;

async function injectDescriptionScript(): Promise<string | null> {
    descriptionLog('Waiting for description element');
    try {
        await waitForElement('#description-inline-expander');
        descriptionLog('Description element found, injecting script');
        
        return new Promise((resolve) => {
            const handleDescription = (event: CustomEvent) => {
                window.removeEventListener('nmt-description-data', handleDescription as EventListener);
                resolve(event.detail?.description || null);
            };

            window.addEventListener('nmt-description-data', handleDescription as EventListener);
            
            const script = document.createElement('script');
            script.textContent = DESCRIPTION_SCRIPT;
            const target = document.head || document.documentElement;
            target?.appendChild(script);
            script.remove();
        });
    } catch (error) {
        console.error(`${LOG_PREFIX}${DESCRIPTION_LOG_CONTEXT} ${error}`);
        return null;
    }
}

class DescriptionCache {
    private processedElements = new WeakMap<HTMLElement, string>();

    hasElement(element: HTMLElement): boolean {
        return this.processedElements.has(element);
    }

    setElement(element: HTMLElement, description: string): void {
        descriptionLog('Caching element with description');
        this.processedElements.set(element, description);
    }

    async getOriginalDescription(): Promise<string | null> {
        return injectDescriptionScript();
    }
}

const descriptionCache = new DescriptionCache();

function setupDescriptionObserver() {
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    browser.storage.local.get('settings').then((data: Record<string, any>) => {
                        const settings = data.settings as ExtensionSettings;
                        if (settings?.descriptionTranslation) {
                            refreshDescription();
                        }
                    });
                }
            }
        });

        observer.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });
}

async function refreshDescription(): Promise<void> {
    const data = await browser.storage.local.get('settings');
    const settings = data.settings as ExtensionSettings;
    if (!settings?.descriptionTranslation) return;

    const descriptionElement = document.querySelector('#description-inline-expander') as HTMLElement;
    if (descriptionElement && !descriptionCache.hasElement(descriptionElement)) {
        descriptionLog('Processing description element');
        const originalDescription = await descriptionCache.getOriginalDescription();
        
        if (originalDescription) {
            descriptionLog('Found original description:', originalDescription);
            // updateDescriptionElement(descriptionElement, originalDescription);
        } else {
            console.error(`${LOG_PREFIX}${DESCRIPTION_LOG_CONTEXT} No original description found`);
        }
    }
}

/*
Function to update the description element, not working as expected for now. Coming next.

function updateDescriptionElement(element: HTMLElement, description: string): void {
    descriptionLog('Updating element with description:', description);
    element.textContent = description;
    element.setAttribute('translate', 'no');
    element.style.setProperty('translate', 'no', 'important');
    descriptionCache.setElement(element, description);
}
*/

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
