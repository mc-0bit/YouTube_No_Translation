/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

async function handleDescriptionTranslation(isEnabled: boolean): Promise<void> {
    if (!isEnabled) return;

    descriptionLog('Waiting for description element');
    try {
        await waitForElement('#description-inline-expander');
        descriptionLog('Description element found, injecting script');
        
        const description = await new Promise<string | null>((resolve) => {
            const handleDescription = (event: CustomEvent) => {
                window.removeEventListener('nmt-description-data', handleDescription as EventListener);
                resolve(event.detail?.description || null);
            };

            window.addEventListener('nmt-description-data', handleDescription as EventListener);
            
            const script = document.createElement('script');
            script.src = browser.runtime.getURL('dist/content/descriptionTranslation/descriptionScript.js');
            document.documentElement.appendChild(script);
        });

        if (description) {
            const descriptionElement = document.querySelector('#description-inline-expander');
            if (descriptionElement && !descriptionCache.hasElement(descriptionElement as HTMLElement)) {
                updateDescriptionElement(descriptionElement as HTMLElement, description);
            }
        }
    } catch (error) {
        descriptionLog(`${error}`);
    }
}

class DescriptionCache {
    private processedElements = new WeakMap<HTMLElement, string>();
    private currentVideoDescription: string | null = null;

    hasElement(element: HTMLElement): boolean {
        return this.processedElements.has(element);
    }

    setElement(element: HTMLElement, description: string): void {
        descriptionLog('Caching element with description');
        this.processedElements.set(element, description);
        this.currentVideoDescription = description;
    }

    getCurrentDescription(): string | null {
        return this.currentVideoDescription;
    }

    clearCurrentDescription(): void {
        this.currentVideoDescription = null;
    }
}

const descriptionCache = new DescriptionCache();

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

async function refreshDescription(): Promise<void> {
    const data = await browser.storage.local.get('settings');
    const settings = data.settings as ExtensionSettings;
    if (!settings?.descriptionTranslation) return;

    const descriptionElement = document.querySelector('#description-inline-expander') as HTMLElement;
    if (descriptionElement && !descriptionCache.hasElement(descriptionElement)) {
        descriptionLog('Processing description element');
        handleDescriptionTranslation(true);
    }
}

function setupDescriptionObserver() {
    // Observer for video changes via URL
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        descriptionLog('Setting up video-id observer');
        const observer = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    descriptionLog('Video ID changed!');
                    descriptionCache.clearCurrentDescription();  // Clear cache on video change
                    // Wait a bit for YouTube to update its data
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Then wait for description element
                    await waitForElement('#description-inline-expander');
                    browser.storage.local.get('settings').then(async (data: Record<string, any>) => {
                        const settings = data.settings as ExtensionSettings;
                        if (settings?.descriptionTranslation) {
                            handleDescriptionTranslation(true);
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
                            const cachedDescription = descriptionCache.getCurrentDescription();
                            if (cachedDescription) {
                                descriptionLog('Using cached description');
                                updateDescriptionElement(descriptionElement as HTMLElement, cachedDescription);
                            } else {
                                const description = await new Promise<string | null>((resolve) => {
                                    const handleDescription = (event: CustomEvent) => {
                                        window.removeEventListener('nmt-description-data', handleDescription as EventListener);
                                        resolve(event.detail?.description || null);
                                    };

                                    window.addEventListener('nmt-description-data', handleDescription as EventListener);
                                    
                                    const script = document.createElement('script');
                                    script.src = browser.runtime.getURL('dist/content/descriptionTranslation/descriptionScript.js');
                                    document.documentElement.appendChild(script);
                                });
                                if (description) {
                                    updateDescriptionElement(descriptionElement as HTMLElement, description);
                                }
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
