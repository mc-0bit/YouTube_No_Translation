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
function setupDescriptionObserver() {
    // Observer for video changes via URL
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        descriptionLog('Setting up video-id observer');
        const observer = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    descriptionLog('Video ID changed!');
                    descriptionCache.clearCurrentDescription();  // Clear cache on video change
                    const descriptionElement = document.querySelector('#description-inline-expander');
                    if (descriptionElement) {
                        refreshDescription();
                    } else {
                        // If not found, wait for it
                        waitForElement('#description-inline-expander').then(() => {
                            refreshDescription();
                        });
                    }
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
        const observer = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'is-expanded') {
                    descriptionLog('Description expanded/collapsed');
                    const cachedDescription = descriptionCache.getCurrentDescription();
                    if (cachedDescription) {
                        descriptionLog('Using cached description');
                        updateDescriptionElement(descriptionElement as HTMLElement, cachedDescription);
                    } else {
                        const description = await new Promise<string | null>((resolve) => {
                            const handleDescription = (event: CustomEvent) => {
                                window.removeEventListener('ynt-description-data', handleDescription as EventListener);
                                resolve(event.detail?.description || null);
                            };
                            window.addEventListener('ynt-description-data', handleDescription as EventListener);
                            const script = document.createElement('script');
                            script.src = browser.runtime.getURL('dist/content/descriptionTranslation/descriptionScript.js');
                            document.documentElement.appendChild(script);
                        });
                        if (description) {
                            updateDescriptionElement(descriptionElement as HTMLElement, description);
                        }
                    }
                }
            }
        });

        observer.observe(descriptionElement, {
            attributes: true,
            attributeFilter: ['is-expanded']
        });
    });
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


// OTHER TITLES OBSERVER -----------------------------------------------------------
let homeObserver: MutationObserver | null = null;
let recommendedObserver: MutationObserver | null = null;
let searchObserver: MutationObserver | null = null;
//let playlistObserver: MutationObserver | null = null;

// --- Observers Setup
function setupOtherTitlesObserver() {
    // --- Observer for home page | Channel page
    waitForElement('#contents.ytd-rich-grid-renderer').then((contents) => {
        homeObserver = new MutationObserver(() => {
            otherTitlesLog('Home/Channel page mutation detected');
            refreshOtherTitles();
        });

        homeObserver.observe(contents, {
            childList: true
        });
        //otherTitlesLog('Home/Channel page observer setup completed');
    });

    // --- Observer for recommended videos
    waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then((contents) => {
        otherTitlesLog('Setting up recommended videos observer');
        recommendedObserver = new MutationObserver(() => {
            otherTitlesLog('Recommended videos mutation detected');
            refreshOtherTitles();
        });

        recommendedObserver.observe(contents, {
            childList: true
        });
        //otherTitlesLog('Recommended videos observer setup completed');
    });

    // --- Observer for search results
    waitForElement('ytd-section-list-renderer #contents').then((contents) => {
        otherTitlesLog('Setting up search results observer');
        searchObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && 
                    mutation.addedNodes.length > 0 && 
                    mutation.target instanceof HTMLElement) {
                    const titles = mutation.target.querySelectorAll('#video-title');
                    if (titles.length > 0) {
                        otherTitlesLog('Search results mutation detected');
                        refreshOtherTitles();
                        break;
                    }
                }
            }
        });

        searchObserver.observe(contents, {
            childList: true,
            subtree: true
        });
        //otherTitlesLog('Search results observer setup completed');
    });

    /*
    // --- Observer for playlist/queue videos
    waitForElement('#playlist ytd-playlist-panel-renderer #items').then((contents) => {
        otherTitlesLog('Setting up playlist/queue videos observer');
        playlistObserver = new MutationObserver(() => {
            otherTitlesLog('Playlist/Queue mutation detected');
            refreshOtherTitles();
        });

        playlistObserver.observe(contents, {
            childList: true
        });
        otherTitlesLog('Playlist/Queue observer setup completed');
    });
    */
}




function setupUrlObserver() {
    otherTitlesLog('Setting up URL observer');
    
    // --- Standard History API monitoring
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
        otherTitlesLog('pushState called with:', args);
        originalPushState.apply(this, args);
        handleUrlChange();
    };

    history.replaceState = function(...args) {
        otherTitlesLog('replaceState called with:', args);
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };

    // --- Browser navigation (back/forward)
    window.addEventListener('popstate', () => {
        otherTitlesLog('popstate event triggered');
        handleUrlChange();
    });

    // --- YouTube's custom page data update event
    window.addEventListener('yt-page-data-updated', () => {
        otherTitlesLog('YouTube page data updated');
        handleUrlChange();
    });

    // --- YouTube's custom SPA navigation events
    /*
    window.addEventListener('yt-navigate-start', () => {
        otherTitlesLog('YouTube SPA navigation started');
        handleUrlChange();
    });
    */

    /*
    window.addEventListener('yt-navigate-finish', () => {
        otherTitlesLog('YouTube SPA navigation completed');
        handleUrlChange();
    });
    */
}

function handleUrlChange() {
    otherTitlesLog(`${LOG_PREFIX}[URL] Current pathname:`, window.location.pathname);
    otherTitlesLog(`${LOG_PREFIX}[URL] Full URL:`, window.location.href);
    
    // --- Clean up existing observers and set up new ones
    homeObserver?.disconnect();
    recommendedObserver?.disconnect();
    searchObserver?.disconnect();
    //playlistObserver?.disconnect();
    
    homeObserver = null;
    recommendedObserver = null;
    searchObserver = null;
    //playlistObserver = null;
    
    otherTitlesLog('Observers cleaned up');
    setupOtherTitlesObserver();
    
    // --- refresh titles 10 seconds after URL change 
    setTimeout(() => {
        refreshOtherTitles();
    }, 10000);
    
    // --- Check if URL contains @username pattern
    const isChannelPage = window.location.pathname.includes('/@');
    if (isChannelPage) {
        // --- Handle all new channel page types (videos, featured, shorts, etc.)
        refreshOtherTitles();
        return;
    }
    
    switch(window.location.pathname) {
        case '/results': // --- Search page
            console.log(`${LOG_PREFIX}[URL] Detected search page`);
            waitForElement('#contents.ytd-section-list-renderer').then(() => {
                otherTitlesLog('Search results container found');
                refreshOtherTitles();
            });
            break;
        case '/': // --- Home page
            console.log(`${LOG_PREFIX}[URL] Detected home page`);
            waitForElement('#contents.ytd-rich-grid-renderer').then(() => {
                otherTitlesLog('Home page container found');
                refreshOtherTitles();
            });
            break;        
        case '/feed/subscriptions': // --- Subscriptions page
            console.log(`${LOG_PREFIX}[URL] Detected subscriptions page`);
            waitForElement('#contents.ytd-rich-grid-renderer').then(() => {
                otherTitlesLog('Subscriptions page container found');
                refreshOtherTitles();
            });
            break;
        case '/feed/trending':  // --- Trending page
        case '/playlist':  // --- Playlist page
        case '/channel':  // --- Channel page (old format)
        case '/watch': // --- Video page
            console.log(`${LOG_PREFIX}[URL] Detected video page`);
            waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then(() => {
                otherTitlesLog('Recommended videos container found');
                refreshOtherTitles();
                    // --- refresh titles 4 seconds after loading video page
                    setTimeout(() => {
                        refreshOtherTitles();
                    }, 4000);
            });
            break;
    }
}