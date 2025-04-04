/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


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
                    mainTitleScript.src = browser.runtime.getURL('dist/content/scripts/mainTitleScript.js');

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


const checkShortsId = () => {
    if (window.location.pathname.startsWith('/shorts')) {
        waitForElement('yt-shorts-video-title-view-model h2.ytShortsVideoTitleViewModelShortsVideoTitle span')
        .then(() => {
            // Extract the current video ID
            const pathSegments = window.location.pathname.split('/');
            const currentVideoId = pathSegments.length > 2 ? pathSegments[2] : null;
            
            if (currentVideoId) {
                mainTitleLog('Shorts ID changed, updating title for ID:', currentVideoId);
                
                // Setup multiple refresh attempts with increasing delays
                const delays = [50, 150, 300, 500];
                
                delays.forEach(delay => {
                    setTimeout(() => {
                        // Only refresh if we're still on the same video
                        const newPathSegments = window.location.pathname.split('/');
                        const newVideoId = newPathSegments.length > 2 ? newPathSegments[2] : null;
                        
                        if (window.location.pathname.startsWith('/shorts') && newVideoId === currentVideoId) {
                            //mainTitleLog(`Refreshing shorts title after ${delay}ms delay`);
                            refreshShortMainTitle();
                        }
                    }, delay);
                });
            }
        });
    }
};

// Handle alternative shorts format with different HTML structure
async function refreshShortsAlternativeFormat(): Promise<void> {
    const now = Date.now();
    if (now - lastBrowsingShortsRefresh < TITLES_THROTTLE) {
        return;
    }
    lastBrowsingShortsRefresh = now;

    // Target the specific structure used for alternative shorts display
    const shortsLinks = document.querySelectorAll('.shortsLockupViewModelHostEndpoint') as NodeListOf<HTMLAnchorElement>;
    
    for (const shortLink of shortsLinks) {
        try {
            // Check if we've already processed this element correctly
            if (shortLink.hasAttribute('ynt')) {
                const currentTitle = shortLink.querySelector('span')?.textContent;
                const storedTitle = shortLink.getAttribute('title');
                
                // If the current displayed title and stored title attribute match, no need to update
                if (currentTitle && storedTitle && 
                    normalizeText(currentTitle) === normalizeText(storedTitle)) {
                    continue;
                }
            }
            
            // Extract video ID from href
            const href = shortLink.getAttribute('href');
            if (!href || !href.includes('/shorts/')) {
                continue;
            }
            
            const videoId = href.split('/shorts/')[1]?.split('?')[0];
            if (!videoId) {
                continue;
            }
            
            // Find the title span element
            const titleSpan = shortLink.querySelector('span');
            if (!titleSpan) {
                continue;
            }
            
            // Get original title through API
            const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
            const originalTitle = await titleCache.getOriginalTitle(apiUrl);
            const currentTitle = titleSpan.textContent;
            
            if (!originalTitle) {
                browsingTitlesLog(`Failed to get original title from API for short: ${videoId}, keeping current title : ${normalizeText(currentTitle)}`);
                continue;
            }
            
            if (normalizeText(currentTitle) === normalizeText(originalTitle)) {
                // Already showing correct title, no need to modify
                titleCache.setElement(shortLink, originalTitle);
                continue;
            }
            
            // Update the title
            browsingTitlesLog(
                `Updated shorts title from: %c${normalizeText(currentTitle)}%c to: %c${normalizeText(originalTitle)}%c (short id: %c${videoId}%c)`,
                'color: grey',
                'color: #fca5a5',
                'color: white',
                'color: #fca5a5',
                'color: #4ade80',
                'color: #fca5a5'
            );
            
            // Set the original title
            titleSpan.textContent = originalTitle;
            shortLink.setAttribute('title', originalTitle);
            shortLink.setAttribute('ynt', videoId);
            titleCache.setElement(shortLink, originalTitle);
            
        } catch (error) {
            browsingTitlesErrorLog('Error processing alternative shorts format:', error);
        }
    }
}