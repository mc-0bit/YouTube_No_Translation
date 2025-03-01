/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



let mainTitleContentObserver: MutationObserver | null = null;
let pageTitleObserver: MutationObserver | null = null;
let mainTitleIsUpdating = false;

// --- Utility Functions
function cleanupmainTitleContentObserver(): void {
    if (mainTitleContentObserver) {
        mainTitleLog('Cleaning up title content observer');
        mainTitleContentObserver.disconnect();
        mainTitleContentObserver = null;
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
    cleanupmainTitleContentObserver();
    
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
    mainTitleContentObserver = new MutationObserver((mutations) => {
        if (mainTitleIsUpdating) return;
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // --- Check if there are multiple text nodes
                const textNodes = Array.from(element.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE);
                
                if (textNodes.length > 1) {
                    mainTitleIsUpdating = true;
                    element.innerText = title;
                    mainTitleIsUpdating = false;
                    mainTitleLog('Multiple text nodes detected, cleaning up');
                }
            }
        });
    });

    mainTitleContentObserver.observe(element, {
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
            // Normalize spaces in both titles before comparing
            const normalizedCurrentTitle = document.title.replace(/\s+/g, ' ');
            const normalizedExpectedTitle = expectedTitle.replace(/\s+/g, ' ');
            
            if (normalizedCurrentTitle !== normalizedExpectedTitle) {
                mainTitleLog('YouTube changed page title, reverting');
                //mainTitleLog('Current:', document.title);
                //mainTitleLog('Expected:', expectedTitle);
                document.title = expectedTitle;
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