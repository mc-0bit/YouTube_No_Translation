/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



let mainTitleObserver: MutationObserver | null = null;
let titleContentObserver: MutationObserver | null = null;
let pageTitleObserver: MutationObserver | null = null;
let isUpdating = false;

// --- Utility Functions
function cleanupTitleContentObserver(): void {
    if (titleContentObserver) {
        mainTitleLog('Cleaning up title content observer');
        titleContentObserver.disconnect();
        titleContentObserver = null;
    }
}

function cleanupPageTitleObserver(): void {
    if (pageTitleObserver) {
        mainTitleLog('Cleaning up page title observer');
        pageTitleObserver.disconnect();
        pageTitleObserver = null;
    }
}

function updateMainTitleElement(element: HTMLElement, title: string, videoId: string): void {
    cleanupTitleContentObserver();
    
    mainTitleLog(
        `Updated title from : %c${element.textContent?.trim()}%c to : %c${title}%c (video id : %c${videoId}%c)`,
        'color: white',    
        'color: #fcd34d',      
        'color: white',    
        'color: #fcd34d',      
        'color: #4ade80',  
        'color: #fcd34d'       
    );

    
    element.removeAttribute('is-empty');
    element.innerText = title;
    
    // --- Block YouTube from re-adding the is-empty attribute
    const isEmptyObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'is-empty') {
                mainTitleLog('Blocking is-empty attribute');
                element.removeAttribute('is-empty');
                element.innerText = title;
            }
        });
    });

    isEmptyObserver.observe(element, {
        attributes: true,
        attributeFilter: ['is-empty']
    });
    
    // --- Block YouTube from adding multiple text nodes
    titleContentObserver = new MutationObserver((mutations) => {
        if (isUpdating) return;
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // --- Check if there are multiple text nodes
                const textNodes = Array.from(element.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE);
                
                if (textNodes.length > 1) {
                    isUpdating = true;
                    element.innerText = title;
                    isUpdating = false;
                    mainTitleLog('Multiple text nodes detected, cleaning up');
                }
            }
        });
    });

    titleContentObserver.observe(element, {
        childList: true
    });

    titleCache.setElement(element, title);
}

function updatePageTitle(mainTitle: string): void {
    cleanupPageTitleObserver();
    
    const expectedTitle = `${mainTitle} - YouTube`;
    document.title = expectedTitle;
    mainTitleLog('Updated page title:', expectedTitle);
    
    const titleElement = document.querySelector('title');
    if (titleElement) {
        pageTitleObserver = new MutationObserver(() => {
            if (document.title !== expectedTitle) {
                document.title = expectedTitle;
                mainTitleLog('YouTube changed page title, reverting');
            }
        });
        
        pageTitleObserver.observe(titleElement, { 
            childList: true 
        });
    }
}


// --- Main Title Function
async function refreshMainTitle(): Promise<void> {
const mainTitle = document.querySelector('h1.ytd-watch-metadata > yt-formatted-string') as HTMLElement;
    if (mainTitle && window.location.pathname === '/watch' && !titleCache.hasElement(mainTitle)) {
        mainTitleLog('Processing main title element');
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId) {
            // --- Check if element has already been processed with this videoId
            const currentTitle = mainTitle.textContent?.trim();
            const originalTitle = await titleCache.getOriginalTitle(
                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`
            );
            // --- Translated title check is not working as the innerText is not modified by YouTube 
            // as soon as we modified it a first time.
            // So we probably won't be able to detect if the title is already translated.
            // Even if we could, it would be better to always update the title
            // since YouTube won't update it.
            try {
                if (!originalTitle) {
                    // Extract current title from document.title
                    const currentPageTitle = document.title.replace(/ - YouTube$/, '');
                    mainTitleLog(`Failed to get original title from API: ${videoId}, using page title`);
                    updateMainTitleElement(mainTitle, currentPageTitle, videoId);
                    return;
                }
                if (currentTitle === originalTitle) {
                    //mainTitleLog('Title is not translated:', videoId);
                    return;
                }
                //mainTitleLog('Main Title is translated:', videoId);
            } catch (error) {
                //mainTitleLog('Failed to get original title for comparison:', error);
            }        

            try {
                updateMainTitleElement(mainTitle, originalTitle, videoId);
                updatePageTitle(originalTitle);
            } catch (error) {
                mainTitleLog(`Failed to update main title:`, error);
            }
        }
    }
}


function setupMainTitleObserver() {
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        mainTitleLog('Setting up video-id observer');
        mainTitleObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    titleCache.clear();
                    
                    const newVideoId = (mutation.target as HTMLElement).getAttribute('video-id');
                    mainTitleLog('Video ID changed:', newVideoId);
                    mainTitleLog('Cache cleared');
                    
                    // --- Get the current page URL to check against
                    const currentUrl = window.location.href;
                    /*mainTitleLog('Current URL:', currentUrl);*/
                    
                    // --- Wait for title element and monitor its changes
                    const titleElement = await waitForElement('ytd-watch-metadata yt-formatted-string.style-scope.ytd-watch-metadata');
                    let attempts = 0;
                    const maxAttempts = 20;
                    
                    while (attempts < maxAttempts) {
                        const pageUrl = window.location.href;
                        
                        if (pageUrl === currentUrl && titleElement.textContent) {
                            await refreshMainTitle();
                            break;
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 100));
                        attempts++;
                    }
                }
            }
        });

        mainTitleObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });
}