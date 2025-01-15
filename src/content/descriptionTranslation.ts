/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



/**
 * NOTE ON SCRIPT INJECTION :
 * We use script injection to access YouTube's description data directly from the page context.
 * This is necessary because ytInitialPlayerResponse is not accessible from the content script context.
 * As you can see down below, the injected code only reads YouTube's data without any modifications.
 */


const DESCRIPTION_SCRIPT = `
(function() {
    const LOG_PREFIX = '${LOG_PREFIX}';
    const LOG_STYLES = ${JSON.stringify(LOG_STYLES)};

    function createLogger(category) {
        return (message, ...args) => {
            console.log(
                \`%c\${LOG_PREFIX}\${category.context} \${message}\`,
                \`color: \${category.color}\`,
                ...args
            );
        };
    }

    const descriptionLog = createLogger(LOG_STYLES.DESCRIPTION);
    
    descriptionLog('Injected script starting');
    
    // Get current video ID from URL
    const currentVideoId = new URLSearchParams(window.location.search).get('v');
    descriptionLog('Current video ID:', currentVideoId);
    
    // Try to get description from the player API endpoint
    fetch('/youtubei/v1/player?key=' + window.ytcfg.data_.INNERTUBE_API_KEY, {
        method: 'POST',
        body: JSON.stringify({
            videoId: currentVideoId,
            context: {
                client: {
                    clientName: 'WEB',
                    clientVersion: window.ytcfg.data_.INNERTUBE_CLIENT_VERSION
                }
            }
        })
    })
    .then(response => response.json())
    .then(data => {
        // Get description directly from videoDetails
        const description = data?.videoDetails?.shortDescription;
        
        if (description) {
            descriptionLog('Found description from API for video:', currentVideoId);
            window.dispatchEvent(new CustomEvent('nmt-description-data', {
                detail: { description }
            }));
        } else {
            descriptionLog('No description found in API response');
            window.dispatchEvent(new CustomEvent('nmt-description-data', {
                detail: { description: null }
            }));
        }
    })
    .catch(error => {
        descriptionLog('Error fetching description:', error);
        window.dispatchEvent(new CustomEvent('nmt-description-data', {
            detail: { description: null }
        }));
    });
})();
`;

async function injectDescriptionScript(): Promise<string | null> {
    descriptionLog('Waiting for description element');
    try {
        await waitForElement('#description-inline-expander');
        descriptionLog('Description element found, injecting script');
        
        // Try up to 3 times to get the description
        for (let i = 0; i < 3; i++) {
            const description = await new Promise<string | null>((resolve) => {
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

            if (description) {
                return description;
            }

            // Wait a bit before retrying
            if (i < 2) {
                descriptionLog('Retrying to get description...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        return null;
    } catch (error) {
        descriptionLog(`${error}`);
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
    // Observer for video changes via URL
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        descriptionLog('Setting up video-id observer');
        const observer = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    descriptionLog('Video ID changed!');
                    // Wait a bit for YouTube to update its data
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Then wait for description element
                    await waitForElement('#description-inline-expander');
                    browser.storage.local.get('settings').then(async (data: Record<string, any>) => {
                        const settings = data.settings as ExtensionSettings;
                        if (settings?.descriptionTranslation) {
                            descriptionLog('Fetching new description');
                            const description = await injectDescriptionScript();
                            if (description) {
                                descriptionLog('Got new description:', description);
                                const descriptionElement = document.querySelector('#description-inline-expander') as HTMLElement;
                                updateDescriptionElement(descriptionElement, description);
                            } else {
                                descriptionLog('Failed to get new description');
                            }
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

    // Observer for description expansion/collapse
    waitForElement('#description-inline-expander').then((descriptionElement) => {
        descriptionLog('Setting up expand/collapse observer');
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'is-expanded') {
                    descriptionLog('Description expanded/collapsed');
                    browser.storage.local.get('settings').then(async (data: Record<string, any>) => {
                        const settings = data.settings as ExtensionSettings;
                        if (settings?.descriptionTranslation) {
                            const description = await injectDescriptionScript();
                            if (description) {
                                updateDescriptionElement(descriptionElement as HTMLElement, description);
                            }
                        }
                    });
                }
            }
        });

        observer.observe(descriptionElement, {
            attributes: true,
            attributeFilter: ['is-expanded']
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
            updateDescriptionElement(descriptionElement, originalDescription);
        } else {
            descriptionLog(`No original description found`);
        }
    }
}


function updateDescriptionElement(element: HTMLElement, description: string): void {
    descriptionLog('Updating element with description');
    
    // Find the text containers
    const attributedString = element.querySelector('yt-attributed-string');
    const snippetAttributedString = element.querySelector('#attributed-snippet-text');
    
    if (!attributedString && !snippetAttributedString) {
        descriptionLog(`No description text container found`);
        return;
    }

    // Create the text content
    const span = document.createElement('span');
    span.className = 'yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap';
    span.dir = 'auto';
    
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    
    const lines = description.split('\n');
    lines.forEach((line, index) => {
        // Split the line by URLs and create elements accordingly
        const parts = line.split(urlPattern);
        parts.forEach((part, partIndex) => {
            if (part.match(urlPattern)) {
                // This is a URL, create a link
                const link = document.createElement('a');
                link.href = part;
                link.textContent = part;
                link.className = 'yt-core-attributed-string__link yt-core-attributed-string__link--call-to-action-color';
                link.setAttribute('target', '_blank');
                link.style.color = 'rgb(62, 166, 255)';
                span.appendChild(link);
            } else if (part) {
                // This is regular text
                span.appendChild(document.createTextNode(part));
            }
        });

        if (index < lines.length - 1) {
            span.appendChild(document.createElement('br'));
        }
    });

    // Update both containers if they exist
    if (attributedString) {
        while (attributedString.firstChild) {
            attributedString.removeChild(attributedString.firstChild);
        }
        attributedString.appendChild(span.cloneNode(true));
    }
    
    if (snippetAttributedString) {
        while (snippetAttributedString.firstChild) {
            snippetAttributedString.removeChild(snippetAttributedString.firstChild);
        }
        snippetAttributedString.appendChild(span.cloneNode(true));
    }

    // Prevent translation on all levels
    [element, attributedString, snippetAttributedString].forEach(el => {
        if (el) {
            el.setAttribute('translate', 'no');
            if (el instanceof HTMLElement) {
                el.style.setProperty('translate', 'no', 'important');
            }
        }
    });
    
    descriptionCache.setElement(element, description);
}

