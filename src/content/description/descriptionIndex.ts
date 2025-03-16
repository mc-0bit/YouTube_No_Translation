/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

async function handleDescriptionTranslation(): Promise<void> {
    descriptionLog('Waiting for description element');
    try {
        await waitForElement('#description-inline-expander');
        descriptionLog('Description element found, injecting script');
        
        const description = await new Promise<string | null>((resolve) => {
            const handleDescription = (event: CustomEvent) => {
                window.removeEventListener('ynt-description-data', handleDescription as EventListener);
                resolve(event.detail?.description || null);
            };

            window.addEventListener('ynt-description-data', handleDescription as EventListener);
            
            const script = document.createElement('script');
            script.src = browser.runtime.getURL('dist/content/description/descriptionScript.js');
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
        //descriptionLog('Caching element with description');
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
    //descriptionLog('Updating element with description');
    
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
    
    // Set up content observer to prevent re-translation
    setupDescriptionContentObserver();
}

async function refreshDescription(): Promise<void> {
    const descriptionElement = document.querySelector('#description-inline-expander') as HTMLElement;
    if (descriptionElement && !descriptionCache.hasElement(descriptionElement)) {
        descriptionLog('Processing description element');
        handleDescriptionTranslation();
    }
}

// Compare description text and determine if update is needed
function compareDescription(element: HTMLElement): Promise<boolean> {
    return new Promise(async (resolve) => {
        // Get the cached description or fetch a new one
        let description = descriptionCache.getCurrentDescription();
        
        if (!description) {
            // Fetch description if not cached
            description = await new Promise<string | null>((resolveDesc) => {
                const handleDescription = (event: CustomEvent) => {
                    window.removeEventListener('ynt-description-data', handleDescription as EventListener);
                    resolveDesc(event.detail?.description || null);
                };
                window.addEventListener('ynt-description-data', handleDescription as EventListener);
                const script = document.createElement('script');
                script.src = browser.runtime.getURL('dist/content/description/descriptionScript.js');
                document.documentElement.appendChild(script);
            });
        }
        
        // If no description available, we need to update (return false)
        if (!description) {
            resolve(false);
            return;
        }
        
        // Find the specific text container with the actual description content
        const snippetAttributedString = element.querySelector('#attributed-snippet-text');
        const coreAttributedString = element.querySelector('.yt-core-attributed-string--white-space-pre-wrap');
        
        if (!snippetAttributedString && !coreAttributedString) {
            resolve(false); // Cannot compare, need to update
            return;
        }
        
        // Get the actual text content
        const currentTextContainer = snippetAttributedString || coreAttributedString;
        const currentText = currentTextContainer?.textContent || "";
        
        // Check if description is already in original language (using prefix matching)
        const isOriginal = normalizeText(description, true).startsWith(normalizeText(currentText, true));
        
        if (isOriginal) {
            descriptionLog('Description is already in original language, no update needed');
        } else {
            descriptionCache.setElement(element, description);
        }
        
        // Return true if original (no update needed), false if update needed
        resolve(isOriginal);
    });
}