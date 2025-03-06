/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



// --- Global variables
let otherTitlesObservers = new Map<HTMLElement, MutationObserver>();



// --- Utility Functions
function cleanupOtherTitlesObserver(element: HTMLElement): void {
    const observer = otherTitlesObservers.get(element);
    if (observer) {
        //otherTitlesLog('Cleaning up title observer');
        observer.disconnect();
        otherTitlesObservers.delete(element);
    }
}

function updateOtherTitleElement(element: HTMLElement, title: string, videoId: string): void {
// --- Clean previous observer
    cleanupOtherTitlesObserver(element);
    
    otherTitlesLog(
        `Updated title from : %c${element.textContent}%c to : %c${title}%c (video id : %c${videoId}%c)`,
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
                    otherTitlesLog('Mutiple title detected, updating hidden span');
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

    otherTitlesObservers.set(element, observer);
    titleCache.setElement(element, title);
}


// --- Other Titles Function
async function refreshOtherTitles(): Promise<void> {
const otherTitles = document.querySelectorAll('#video-title') as NodeListOf<HTMLElement>;
    //otherTitlesLog('Found videos titles:', otherTitles.length);

    for (const titleElement of otherTitles) {
        if (!titleCache.hasElement(titleElement)) {
            //otherTitlesLog('Processing video title:', titleElement.textContent);
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
                            otherTitlesLog(`Failed to get original title from API: ${videoId}, keeping current title`);
                            titleElement.removeAttribute('ynt');
                            currentTitle && titleElement.setAttribute('title', currentTitle);
                            continue;
                        }
                        if (normalizeTitle(currentTitle) === normalizeTitle(originalTitle)) {
                            //otherTitlesLog('Title is not translated: ', videoId);
                            titleElement.removeAttribute('ynt');
                            currentTitle && titleElement.setAttribute('title', currentTitle);
                            continue;
                        }
                        if (normalizeTitle(titleElement.getAttribute('title')) === normalizeTitle(originalTitle)) {
                            continue;
                        }
                        //otherTitlesLog('Title is translated: ', videoId);
                    } catch (error) {
                        //otherTitlesLog('Failed to get original title for comparison:', error);
                    }                 
                    try {
                        updateOtherTitleElement(titleElement, originalTitle, videoId);
                    } catch (error) {
                        otherTitlesLog(`Failed to update recommended title:`, error);
                    }
                }
            }
        }
    }
}