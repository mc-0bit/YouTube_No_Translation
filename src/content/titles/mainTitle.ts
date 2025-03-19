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
let isEmptyObserver: MutationObserver | null = null;
let mainTitleIsUpdating = false;

// --- Utility Functions
function cleanupMainTitleContentObserver(): void {
    if (mainTitleContentObserver) {
        //mainTitleLog('Cleaning up title content observer');
        mainTitleContentObserver.disconnect();
        mainTitleContentObserver = null;
    }
}

function cleanupIsEmptyObserver(): void {
    if (isEmptyObserver) {
        //mainTitleLog('Cleaning up is-empty observer');
        isEmptyObserver.disconnect();
        isEmptyObserver = null;
    }
}

function cleanupPageTitleObserver(): void {
    if (pageTitleObserver) {
        //mainTitleLog('Cleaning up page title observer');
        pageTitleObserver.disconnect();
        pageTitleObserver = null;
    }
}

function updateMainTitleElement(element: HTMLElement, title: string, videoId: string): void {
    cleanupMainTitleContentObserver();
    cleanupIsEmptyObserver();
    
    mainTitleLog(
        `Updated title from : %c${normalizeText(element.textContent)}%c to : %c${normalizeText(title)}%c (video id : %c${videoId}%c)`,
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
    isEmptyObserver = new MutationObserver((mutations) => {
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
            if (normalizeText(document.title) !== normalizeText(expectedTitle)) {
                mainTitleLog('YouTube changed page title, reverting');
                //mainTitleLog('Current:', normalizeText(document.title));
                //mainTitleLog('Expected:', normalizeText(expectedTitle));
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
            const currentTitle = mainTitle.textContent;
            let originalTitle: string | null = null;

            // First try: Get title from player
            try {
                // Create and inject script
                const mainTitleScript = document.createElement('script');
                mainTitleScript.type = 'text/javascript';
                mainTitleScript.src = browser.runtime.getURL('dist/content/titles/mainTitleScript.js');

                // Set up event listener before injecting script
                const playerTitle = await new Promise<string | null>((resolve) => {
                    const titleListener = (event: TitleDataEvent) => {
                        window.removeEventListener('ynt-title-data', titleListener as EventListener);
                        resolve(event.detail.title);
                    };
                    window.addEventListener('ynt-title-data', titleListener as EventListener);
                    
                    // Inject script after listener is ready
                    document.head.appendChild(mainTitleScript);
                });

                if (playerTitle) {
                    //mainTitleLog('Got original title from player');
                    originalTitle = playerTitle;
                }
            } catch (error) {
                mainTitleErrorLog('Failed to get title from player:', error);
            }

            // Second try: Fallback to oembed API
            if (!originalTitle) {
                mainTitleLog('Falling back to oembed API');
                originalTitle = await titleCache.getOriginalTitle(
                    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`
                );
            }

            // Last resort: Use page title
            if (!originalTitle) {
                const currentPageTitle = document.title.replace(/ - YouTube$/, '');
                mainTitleLog(`Failed to get original title using both methods, using page title as last resort`);
                updateMainTitleElement(mainTitle, currentPageTitle, videoId);
                return;
            }

            // Skip if title is already correct
            if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                return;
            }

            // Apply the original title
            try {
                updateMainTitleElement(mainTitle, originalTitle, videoId);
                updatePageTitle(originalTitle);
            } catch (error) {
                mainTitleErrorLog(`Failed to update main title:`, error);
            }
        }
    }
}



// --- Embed Title Function
async function refreshEmbedTitle(): Promise<void> {
    const embedTitle = document.querySelector('.ytp-title-link') as HTMLElement;
    if (embedTitle && !titleCache.hasElement(embedTitle)) {
        mainTitleLog('Processing embed title element');
        
        // Get video ID from pathname
        const videoId = window.location.pathname.split('/embed/')[1];
        
        if (videoId) {
            const currentTitle = embedTitle.textContent;
            let originalTitle: string | null = null;

            // First try: Get title from player
            try {
                const mainTitleScript = document.createElement('script');
                mainTitleScript.type = 'text/javascript';
                mainTitleScript.src = browser.runtime.getURL('dist/content/titles/mainTitleScript.js');

                // Set up event listener before injecting script
                const playerTitle = await new Promise<string | null>((resolve) => {
                    const titleListener = (event: TitleDataEvent) => {
                        window.removeEventListener('ynt-title-data', titleListener as EventListener);
                        resolve(event.detail.title);
                    };
                    window.addEventListener('ynt-title-data', titleListener as EventListener);
                    
                    // Inject script after listener is ready
                    document.head.appendChild(mainTitleScript);
                });

                if (playerTitle) {
                    originalTitle = playerTitle;
                }
            } catch (error) {
                mainTitleErrorLog('Failed to get title from player:', error);
            }

            // Second try: Fallback to oembed API
            if (!originalTitle) {
                mainTitleLog('Falling back to oembed API');
                originalTitle = await titleCache.getOriginalTitle(
                    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`
                );
            }

            if (!originalTitle) {
                mainTitleLog('Failed to get original title, keeping current');
                return;
            }

            // Skip if title is already correct
            if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                return;
            }

            // Apply the original title
            try {
                updateMainTitleElement(embedTitle, originalTitle, videoId);
                updatePageTitle(originalTitle);
            } catch (error) {
                mainTitleErrorLog(`Failed to update embed title:`, error);
            }
        }
    }
}

// --- Shorts Title Function
async function refreshShortMainTitle(): Promise<void> {
    // Get the shorts title element
    const shortTitle = document.querySelector('yt-shorts-video-title-view-model h2.ytShortsVideoTitleViewModelShortsVideoTitle span') as HTMLElement;
    
    // Get the linked video title element (additional title to translate)
    const linkedVideoTitle = document.querySelector('.ytReelMultiFormatLinkViewModelTitle span') as HTMLElement;
    
    if (window.location.pathname.startsWith('/shorts')) {
        //mainTitleLog('Processing shorts title elements');
        
        // Extract the video ID from the URL
        // Format: /shorts/TNtpUQbW4mg
        const pathSegments = window.location.pathname.split('/');
        const videoId = pathSegments.length > 2 ? pathSegments[2] : null;
        
        if (videoId) {
            // Process main shorts title
            if (shortTitle && !titleCache.hasElement(shortTitle)) {
                const currentTitle = shortTitle.textContent;
                let originalTitle: string | null = null;

                // First try: Get title from player
                try {
                    // Create and inject script
                    const mainTitleScript = document.createElement('script');
                    mainTitleScript.type = 'text/javascript';
                    mainTitleScript.src = browser.runtime.getURL('dist/content/titles/mainTitleScript.js');

                    // Set up event listener before injecting script
                    const playerTitle = await new Promise<string | null>((resolve) => {
                        const titleListener = (event: TitleDataEvent) => {
                            window.removeEventListener('ynt-title-data', titleListener as EventListener);
                            resolve(event.detail.title);
                        };
                        window.addEventListener('ynt-title-data', titleListener as EventListener);
                        
                        // Inject script after listener is ready
                        document.head.appendChild(mainTitleScript);
                    });

                    if (playerTitle) {
                        originalTitle = playerTitle;
                    }
                } catch (error) {
                    mainTitleErrorLog('Failed to get shorts title from player:', error);
                }

                // Second try: Fallback to oembed API
                if (!originalTitle) {
                    mainTitleLog('Falling back to oembed API for shorts');
                    originalTitle = await titleCache.getOriginalTitle(
                        `https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${videoId}`
                    );
                }

                // Skip if title is already correct
                if (!originalTitle || normalizeText(currentTitle) === normalizeText(originalTitle)) {
                    //mainTitleLog('Main shorts title already correct or could not be retrieved');
                } else {
                    // Apply the original title
                    try {
                        updateMainTitleElement(shortTitle, originalTitle, videoId);
                        // No need to update page title for shorts
                    } catch (error) {
                        mainTitleErrorLog(`Failed to update shorts title:`, error);
                    }
                }
            }
            
            // Process linked video title (if present)
            if (linkedVideoTitle) {
                const currentLinkedTitle = linkedVideoTitle.textContent;
                
                // Get the linked video ID from the parent anchor element
                const linkedVideoAnchor = linkedVideoTitle.closest('a.ytReelMultiFormatLinkViewModelEndpoint') as HTMLAnchorElement;
                if (linkedVideoAnchor) {
                    const linkedVideoUrl = linkedVideoAnchor.getAttribute('href');
                    if (linkedVideoUrl) {
                        // Extract video ID from URL format "/watch?v=VIDEO_ID"
                        const linkedVideoIdMatch = linkedVideoUrl.match(/\/watch\?v=([^&]+)/);
                        const linkedVideoId = linkedVideoIdMatch ? linkedVideoIdMatch[1] : null;
                        
                        if (linkedVideoId) {
                           // mainTitleLog(`Processing linked video title with ID: ${linkedVideoId}`);
                            
                            // Using only oembed API for linked video as mentioned
                            const linkedOriginalTitle = await titleCache.getOriginalTitle(
                                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${linkedVideoId}`
                            );
                            
                            if (linkedOriginalTitle && normalizeText(currentLinkedTitle) !== normalizeText(linkedOriginalTitle)) {
                                try {
                                    updateMainTitleElement(linkedVideoTitle, linkedOriginalTitle, linkedVideoId);
                                } catch (error) {
                                    mainTitleErrorLog(`Failed to update linked video title:`, error);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}