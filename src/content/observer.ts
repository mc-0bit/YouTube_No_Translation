/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */




// AUDIO OBSERVERS --------------------------------------------------------------------
let audioObserver: MutationObserver | null = null;


function setupAudioObserver() {
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        audioObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    // Wait for movie_player before injecting script
                    waitForElement('#movie_player').then(() => {
                        handleAudioTranslation();
                    });
                }
            }
        });

        audioObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });
}


// DESCRIPTION OBSERVERS ------------------------------------------------------------
let descriptionObserver: MutationObserver | null = null;
let descriptionExpansionObserver: MutationObserver | null = null;
let descriptionContentObserver: MutationObserver | null = null;


function setupDescriptionObserver() {
    // Observer for video changes via URL
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        descriptionLog('Setting up video-id observer');
        descriptionObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    descriptionLog('Video ID changed!');
                    descriptionCache.clearCurrentDescription();  // Clear cache on video change
                    const descriptionElement = document.querySelector('#description-inline-expander');
                    if (descriptionElement) {
                        waitForElement('#movie_player').then(() => {
                            // Instead of calling refreshDescription directly
                            // Call compareDescription first
                            
                            compareDescription(descriptionElement as HTMLElement).then(isOriginal => {
                                if (!isOriginal) {
                                    // Only refresh if not original                                 
                                    refreshDescription();
                                    descriptionExpandObserver();
                                    setupDescriptionContentObserver();
                                } else {
                                    cleanupDescriptionObservers();
                                }
                            });
                        });
                    } else {
                        // If not found, wait for it
                        waitForElement('#description-inline-expander').then(() => {
                            refreshDescription();
                            descriptionExpandObserver()
                        });
                    }
                }
            }
        });

        descriptionObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });


}

function descriptionExpandObserver() {
    // Observer for description expansion/collapse
    waitForElement('#description-inline-expander').then((descriptionElement) => {
        //descriptionLog('Setting up expand/collapse observer');
        descriptionExpansionObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'is-expanded') {
                    descriptionLog('Description expanded/collapsed');
                    const cachedDescription = descriptionCache.getCurrentDescription();
                    if (cachedDescription) {
                        //descriptionLog('Using cached description');
                        updateDescriptionElement(descriptionElement as HTMLElement, cachedDescription);
                    } else {
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
                            updateDescriptionElement(descriptionElement as HTMLElement, description);
                        }
                    }
                }
            }
        });

        descriptionExpansionObserver.observe(descriptionElement, {
            attributes: true,
            attributeFilter: ['is-expanded']
        });
    });
}

function setupDescriptionContentObserver() {
    // Clean up existing observer if any
    cleanupDescriptionContentObserver();
    
    const descriptionElement = document.querySelector('#description-inline-expander');
    if (!descriptionElement) {
        descriptionLog('Description element not found, skipping content observer setup');
        return;
    }
    
    // Get cached description
    const cachedDescription = descriptionCache.getCurrentDescription();
    if (!cachedDescription) {
        descriptionLog('No cached description available, skipping content observer setup');
        return;
    }
    
    //descriptionLog('Setting up description content observer');
    
    descriptionContentObserver = new MutationObserver((mutations) => {
        // Skip if we don't have a cached description to compare with
        if (!cachedDescription) return;
        
        // Get current description text
        const currentText = descriptionElement.textContent?.trim();
        
        // Skip if they're the same (ignoring whitespace differences)
        if (!currentText || normalizeText(currentText, true) === normalizeText(cachedDescription, true)) return;

        descriptionLog('Description content changed by YouTube, restoring original');
        
        // Temporarily disconnect to prevent infinite loop
        descriptionContentObserver?.disconnect();
        
        // Update with original description
        updateDescriptionElement(descriptionElement as HTMLElement, cachedDescription);
        
        // Reconnect observer
        if (descriptionContentObserver) {
            descriptionContentObserver.observe(descriptionElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    });
    
    // Start observing
    if (descriptionContentObserver) {
        descriptionContentObserver.observe(descriptionElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    //descriptionLog('Description content observer setup completed');
}


function cleanupDescriptionContentObserver() {
    if (descriptionContentObserver) {
        //descriptionLog('Cleaning up description content observer');
        descriptionContentObserver.disconnect();
        descriptionContentObserver = null;
    }
}
function cleanupDescriptionObservers(): void {
if (descriptionExpansionObserver) {
        descriptionExpansionObserver.disconnect();
        descriptionExpansionObserver = null;
    }
    // Clean up content observer
    cleanupDescriptionContentObserver();

}


// MAIN TITLE OBSERVERS ---------------------------------------------
let mainTitleObserver: MutationObserver | null = null;


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
                    
                    // Wait for movie_player and title element
                    const [player, titleElement] = await Promise.all([
                        waitForElement('#movie_player'),
                        waitForElement('ytd-watch-metadata yt-formatted-string.style-scope.ytd-watch-metadata')
                    ]);

                    // Only proceed if we're still on the same page
                    if (titleElement.textContent) {
                        await refreshMainTitle();
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


// SUBTITLES OBSERVERS --------------------------------------------------------------------
let subtitlesObserver: MutationObserver | null = null;

function setupSubtitlesObserver() {
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        subtitlesObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    // Wait for movie_player before injecting script
                    waitForElement('#movie_player').then(() => {
                        handleSubtitlesTranslation();
                    });
                }
            }
        });

        subtitlesObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });
}


// BROWSING TITLES OBSERVER -----------------------------------------------------------
let homeObserver: MutationObserver | null = null;
let recommendedObserver: MutationObserver | null = null;
let searchObserver: MutationObserver | null = null;
let playlistObserver: MutationObserver | null = null;

// --- Observers Setup
function setupBrowsingTitlesObserver() {
    // --- Observer for home page | Channel page
    waitForElement('#contents.ytd-rich-grid-renderer').then((contents) => {
        homeObserver = new MutationObserver(() => {
            browsingTitlesLog('Home/Channel page mutation detected');
            refreshBrowsingTitles();
        });

        homeObserver.observe(contents, {
            childList: true
        });
        //browsingTitlesLog('Home/Channel page observer setup completed');
    });

    // --- Observer for recommended videos
    waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then((contents) => {
        browsingTitlesLog('Setting up recommended videos observer');
        recommendedObserver = new MutationObserver(() => {
            browsingTitlesLog('Recommended videos mutation detected');
            refreshBrowsingTitles();
        });

        recommendedObserver.observe(contents, {
            childList: true
        });
        //browsingTitlesLog('Recommended videos observer setup completed');
    });

    // --- Observer for search results
    waitForElement('ytd-section-list-renderer #contents').then((contents) => {
        browsingTitlesLog('Setting up search results observer');
        searchObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && 
                    mutation.addedNodes.length > 0 && 
                    mutation.target instanceof HTMLElement) {
                    const titles = mutation.target.querySelectorAll('#video-title');
                    if (titles.length > 0) {
                        browsingTitlesLog('Search results mutation detected');
                        refreshBrowsingTitles();
                        refreshShortsAlternativeFormat();
                        break;
                    }
                }
            }
        });

        searchObserver.observe(contents, {
            childList: true,
            subtree: true
        });
        //browsingTitlesLog('Search results observer setup completed');
    });

    // --- Observer for playlist/queue videos
    waitForElement('#playlist ytd-playlist-panel-renderer #items').then((contents) => {
        browsingTitlesLog('Setting up playlist/queue videos observer');
        playlistObserver = new MutationObserver(() => {
            browsingTitlesLog('Playlist/Queue mutation detected');
            refreshBrowsingTitles();
        });

        playlistObserver.observe(contents, {
            childList: true
        });
        browsingTitlesLog('Playlist/Queue observer setup completed');
    });
}




function setupUrlObserver() {
    coreLog('Setting up URL observer');
    
    // --- Standard History API monitoring
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
        coreLog('pushState called with:', args);
        originalPushState.apply(this, args);
        handleUrlChange();
    };

    history.replaceState = function(...args) {
        coreLog('replaceState called with:', args);
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };

    // --- Browser navigation (back/forward)
    window.addEventListener('popstate', () => {
        coreLog('popstate event triggered');
        handleUrlChange();
    });

    // --- YouTube's custom page data update event
    window.addEventListener('yt-page-data-updated', () => {
        coreLog('YouTube page data updated');
        handleUrlChange();
    });

    // --- YouTube's custom SPA navigation events
    /*
    window.addEventListener('yt-navigate-start', () => {
        coreLog('YouTube SPA navigation started');
        handleUrlChange();
    });
    */

    /*
    window.addEventListener('yt-navigate-finish', () => {
        coreLog('YouTube SPA navigation completed');
        handleUrlChange();
    });
    */
}

function handleUrlChange() {
    coreLog(`${LOG_PREFIX}[URL] Current pathname:`, window.location.pathname);
    coreLog(`${LOG_PREFIX}[URL] Full URL:`, window.location.href);
    
    // --- Clean up existing observers and set up new ones
    homeObserver?.disconnect();
    recommendedObserver?.disconnect();
    searchObserver?.disconnect();
    //playlistObserver?.disconnect();
    homeObserver = null;
    recommendedObserver = null;
    searchObserver = null;
    //playlistObserver = null;
    cleanupmainTitleContentObserver();
    cleanupPageTitleObserver();
    cleanupDescriptionObservers();
    
    
    browsingTitlesLog('Observers cleaned up');
    setupBrowsingTitlesObserver();
    
    // --- refresh titles 10 seconds after URL change 
    setTimeout(() => {
        refreshBrowsingTitles();
    }, 10000);
    
    // --- Check if URL contains @username pattern
    const isChannelPage = window.location.pathname.includes('/@');
    if (isChannelPage) {
        // --- Handle all new channel page types (videos, featured, shorts, etc.)
        refreshBrowsingTitles();
        return;
    }
    
    switch(window.location.pathname) {
        case '/results': // --- Search page
            console.log(`${LOG_PREFIX}[URL] Detected search page`);
            waitForElement('#contents.ytd-section-list-renderer').then(() => {
                browsingTitlesLog('Search results container found');
                refreshBrowsingTitles();
                refreshShortsAlternativeFormat();
            });
            break;
        case '/': // --- Home page
            console.log(`${LOG_PREFIX}[URL] Detected home page`);
            waitForElement('#contents.ytd-rich-grid-renderer').then(() => {
                browsingTitlesLog('Home page container found');
                refreshBrowsingTitles();
            });
            break;        
        case '/feed/subscriptions': // --- Subscriptions page
            console.log(`${LOG_PREFIX}[URL] Detected subscriptions page`);
            waitForElement('#contents.ytd-rich-grid-renderer').then(() => {
                browsingTitlesLog('Subscriptions page container found');
                refreshBrowsingTitles();
            });
            break;
        case '/feed/trending':  // --- Trending page
        case '/playlist':  // --- Playlist page
        case '/channel':  // --- Channel page (old format)
        case '/watch': // --- Video page
            console.log(`${LOG_PREFIX}[URL] Detected video page`);
            waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then(() => {
                browsingTitlesLog('Recommended videos container found');
                refreshBrowsingTitles();
                    // --- refresh titles 4 seconds after loading video page
                    setTimeout(() => {
                        refreshBrowsingTitles();
                    }, 4000);
            });
            break;
    }
}


// Special observer setup for youtube-nocookie.com embedded videos
function setupNoCookieObserver() {
    coreLog('Setting up youtube-nocookie observer');
    
    // Create a flag to track if we've already set up the play event listener
    let playEventSetup = false;
    let videoObserver: MutationObserver | null = null;
    
    // Function to set up the play event listener on video element
    const setupPlayEventListener = (videoElement: HTMLVideoElement) => {
        // Avoid setting up the listener multiple times
        if (playEventSetup || videoElement.dataset.yntListenerSetup === 'true') return;
        
        videoElement.dataset.yntListenerSetup = 'true';
        playEventSetup = true;
        
        // Set up one-time play event listener
        videoElement.addEventListener('play', () => {
            coreLog('Video play detected on youtube-nocookie, initializing features');
            
            // Short timeout to ensure player API is fully ready after play starts
            setTimeout(() => {
                if (currentSettings?.audioTranslation) {
                    handleAudioTranslation();
                }
                
                if (currentSettings?.subtitlesTranslation) {
                    handleSubtitlesTranslation();
                }
                
                // Clean up the observer since we no longer need it
                if (videoObserver) {
                    videoObserver.disconnect();
                    videoObserver = null;
                }
            }, 1000);
        }, { once: true }); // Only trigger once
    };
    
    // Check if video element already exists
    const existingVideo = document.querySelector('video');
    if (existingVideo) {
        setupPlayEventListener(existingVideo as HTMLVideoElement);
        return; // No need for observer if video already exists
    }
    
    // Create mutation observer to watch for video element being added to the DOM
    videoObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Look for video element in added nodes and their children
                for (const node of mutation.addedNodes) {
                    if (node instanceof HTMLElement) {
                        // Check if node is video or contains video
                        if (node.tagName === 'VIDEO') {
                            setupPlayEventListener(node as HTMLVideoElement);
                            return;
                        } else {
                            const videoElement = node.querySelector('video');
                            if (videoElement) {
                                setupPlayEventListener(videoElement);
                                return;
                            }
                        }
                    }
                }
            }
        }
    });
    
    // Observe the entire document for video element
    videoObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}