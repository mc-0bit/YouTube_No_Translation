/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



// --- Global variables
let browsingTitlesObservers = new Map<HTMLElement, MutationObserver>();



// --- Utility Functions
function cleanupBrowsingTitlesObserver(element: HTMLElement): void {
    const observer = browsingTitlesObservers.get(element);
    if (observer) {
        //browsingTitlesLog('Cleaning up title observer');
        observer.disconnect();
        browsingTitlesObservers.delete(element);
    }
}

function updateBrowsingTitleElement(element: HTMLElement, title: string, videoId: string): void {
// --- Clean previous observer
    cleanupBrowsingTitlesObserver(element);
    
    browsingTitlesLog(
        `Updated title from : %c${normalizeTitle(element.textContent)}%c to : %c${normalizeTitle(title)}%c (video id : %c${videoId}%c)`,
        'color: white',    // --- currentTitle style
        'color: #fca5a5',      // --- reset color
        'color: white',    // --- originalTitle style
        'color: #fca5a5',      // --- reset color
        'color: #4ade80',  // --- videoId style (light green)
        'color: #fca5a5'       // --- reset color
    );
    
    // --- Inject CSS if not already done
    if (!document.querySelector('#ynt-style')) {
        const style = document.createElement('style');
        style.id = 'ynt-style';
        style.textContent = `
            #video-title[ynt] > span {
                display: none;
            }

            #video-title[ynt]::after {
                content: attr(title);
                font-size: var(--ytd-tab-system-font-size-body);
                line-height: var(--ytd-tab-system-line-height-body);
                font-family: var(--ytd-tab-system-font-family);
            }
        `;
        document.head.appendChild(style);
    }

    // --- Create span if not exists
    let span = element.querySelector('span');
    if (!span) {
        span = document.createElement('span');
        span.textContent = element.textContent;
        element.textContent = '';
        element.appendChild(span);
    }

    element.setAttribute('title', title);
    element.setAttribute('ynt', videoId);

    // --- Add observer to update span with latest text
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const directTextNodes = Array.from(element.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE);
                
                if (directTextNodes.length > 0) {
                    browsingTitlesLog('Mutiple title detected, updating hidden span');
                    const span = element.querySelector('span');
                    if (span) {
                        // --- Get last added text node
                        const lastTextNode = directTextNodes[directTextNodes.length - 1];
                        span.textContent = lastTextNode.textContent;
                        // --- Remove all direct text nodes
                        directTextNodes.forEach(node => node.remove());
                    }
                }
            }
        });
    });

    observer.observe(element, {
        childList: true
    });

    browsingTitlesObservers.set(element, observer);
    titleCache.setElement(element, title);
}


// --- Other Titles Function
async function refreshBrowsingTitles(): Promise<void> {
const browsingTitles = document.querySelectorAll('#video-title') as NodeListOf<HTMLElement>;
    //browsingTitlesLog('Found videos titles:', browsingTitles.length);

    for (const titleElement of browsingTitles) {
        if (!titleCache.hasElement(titleElement)) {
            //browsingTitlesLog('Processing video title:', titleElement.textContent);
            const videoUrl = titleElement.closest('a')?.href;
            if (videoUrl) {
                const videoId = new URLSearchParams(new URL(videoUrl).search).get('v');
                if (videoId) {
                    // --- Check if title is not translated
                    const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
                    const originalTitle = await titleCache.getOriginalTitle(apiUrl);
                    const currentTitle = titleElement.textContent;
                    try {
                        if (!originalTitle) {
                            browsingTitlesLog(`Failed to get original title from API: ${videoId}, keeping current title`);
                            titleElement.removeAttribute('ynt');
                            currentTitle && titleElement.setAttribute('title', currentTitle);
                            continue;
                        }
                        if (normalizeTitle(currentTitle) === normalizeTitle(originalTitle)) {
                            //browsingTitlesLog('Title is not translated: ', videoId);
                            titleElement.removeAttribute('ynt');
                            currentTitle && titleElement.setAttribute('title', currentTitle);
                            continue;
                        }
                        if (normalizeTitle(titleElement.getAttribute('title')) === normalizeTitle(originalTitle)) {
                            continue;
                        }
                        //browsingTitlesLog('Title is translated: ', videoId);
                    } catch (error) {
                        //browsingTitlesErrorLog('Failed to get original title for comparison:', error);
                    }                 
                    try {
                        updateBrowsingTitleElement(titleElement, originalTitle, videoId);
                    } catch (error) {
                        browsingTitlesErrorLog(`Failed to update recommended title:`, error);
                    }
                }
            }
        }
    }
}