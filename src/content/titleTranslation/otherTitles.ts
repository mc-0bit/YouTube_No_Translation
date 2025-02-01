/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



// Global variables
let homeObserver: MutationObserver | null = null;
let recommendedObserver: MutationObserver | null = null;
let searchObserver: MutationObserver | null = null;
//let playlistObserver: MutationObserver | null = null;



// Utility Functions
function updateOtherTitleElement(element: HTMLElement, title: string, videoId: string): void {
    //otherTitlesLog('Updating element with title:', title);
    
    // Inject CSS if not already done
    if (!document.querySelector('#nmt-style')) {
        const style = document.createElement('style');
        style.id = 'nmt-style';
        style.textContent = `
            #video-title[nmt] > span {
                display: none;
            }

            #video-title[nmt]::after {
                content: attr(title);
                font-size: var(--ytd-tab-system-font-size-body);
                line-height: var(--ytd-tab-system-line-height-body);
                font-family: var(--ytd-tab-system-font-family);
            }
        `;
        document.head.appendChild(style);
    }

    // Wrap existing text in a span if not already done
    if (!element.querySelector('span')) {
        const span = document.createElement('span');
        span.textContent = element.textContent;
        element.textContent = '';
        element.appendChild(span);
    }

    element.setAttribute('title', title);
    element.setAttribute('nmt', videoId);
    titleCache.setElement(element, title);
}


// Other Titles Function
async function refreshOtherTitles(): Promise<void> {
    const data = await browser.storage.local.get('settings');
    const settings = data.settings as ExtensionSettings;
    if (!settings?.titleTranslation) return;

    // Handle recommended video titles
    const recommendedTitles = document.querySelectorAll('#video-title') as NodeListOf<HTMLElement>;
    //otherTitlesLog('Found videos titles:', recommendedTitles.length);

    for (const titleElement of recommendedTitles) {
        if (!titleCache.hasElement(titleElement)) {
            //otherTitlesLog('Processing video title:', titleElement.textContent);
            const videoUrl = titleElement.closest('a')?.href;
            if (videoUrl) {
                const videoId = new URLSearchParams(new URL(videoUrl).search).get('v');
                if (videoId) {
                    // Check if title is not translated
                    const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`;
                    const originalTitle = await titleCache.getOriginalTitle(apiUrl);
                    const currentTitle = titleElement.textContent?.trim();
                    try {
                        if (!originalTitle) {
                            otherTitlesLog(`Failed to get original title from API: ${videoId}, keeping current title`);
                            continue;
                        }
                        if (currentTitle === originalTitle) {
                            //otherTitlesLog('Title is not translated: ', videoId);
                            continue;
                        }
                        //otherTitlesLog('Title is translated: ', videoId);
                    } catch (error) {
                        //otherTitlesLog('Failed to get original title for comparison:', error);
                    }                 
                    try {
                        updateOtherTitleElement(titleElement, originalTitle, videoId);
                        otherTitlesLog(
                            `Updated title from : %c${currentTitle}%c to : %c${originalTitle}%c (video id : %c${videoId}%c)`,
                            'color: white',    // currentTitle style
                            'color: #fca5a5',      // reset color
                            'color: white',    // originalTitle style
                            'color: #fca5a5',      // reset color
                            'color: #4ade80',  // videoId style (light green)
                            'color: #fca5a5'       // reset color
                        );
                    } catch (error) {
                        otherTitlesLog(`Failed to update recommended title:`, error);
                    }
                }
            }
        }
    }

    // Handle search results
    //await handleSearchResults();
}


// Observers Setup
function setupOtherTitlesObserver() {
    // Observer for home page | Channel page
    waitForElement('#contents.ytd-rich-grid-renderer').then((contents) => {
        homeObserver = new MutationObserver(() => {
            otherTitlesLog('Home/Channel page mutation detected');
            refreshOtherTitles();
        });

        homeObserver.observe(contents, {
            childList: true
        });
        otherTitlesLog('Home/Channel page observer setup completed');
    });

    // Observer for recommended videos
    waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then((contents) => {
        otherTitlesLog('Setting up recommended videos observer');
        recommendedObserver = new MutationObserver(() => {
            otherTitlesLog('Recommended videos mutation detected');
            refreshOtherTitles();
        });

        recommendedObserver.observe(contents, {
            childList: true
        });
        otherTitlesLog('Recommended videos observer setup completed');
    });

    // Observer for search results
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
        otherTitlesLog('Search results observer setup completed');
    });

    /*
    // Observer for playlist/queue videos
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


/*
// New function to handle search results
async function handleSearchResults(): Promise<void> {
    otherTitlesLog('Processing search results');
    
    // Select all untreated video titles
    const videoTitles = document.querySelectorAll('ytd-video-renderer #video-title:not([translate="no"])') as NodeListOf<HTMLAnchorElement>;
    
    otherTitlesLog('Found video titles:', videoTitles.length);

    for (const titleElement of videoTitles) {
        if (!titleCache.hasElement(titleElement)) {
            otherTitlesLog('Processing search result title:', titleElement.textContent);
            const videoUrl = titleElement.href;
            if (videoUrl) {
                const videoId = new URLSearchParams(new URL(videoUrl).search).get('v');
                if (videoId) {
                    // Check if element has already been processed with this videoId
                    const currentNMT = titleElement.getAttribute('NMT');
                    if (currentNMT === videoId) {
                        otherTitlesLog('Title already processed for video:', videoId);
                        continue;
                    }

                    try {
                        const originalTitle = await titleCache.getOriginalTitle(
                            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`
                        );
                        updateOtherTitleElement(titleElement, originalTitle, videoId);
                    } catch (error) {
                        otherTitlesLog(`Failed to update search result title:`, error);
                    }
                }
            }
        }
    }
}
*/


function setupUrlObserver() {
    otherTitlesLog('Setting up URL observer');
    
    // Standard History API monitoring
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

    // Browser navigation (back/forward)
    window.addEventListener('popstate', () => {
        otherTitlesLog('popstate event triggered');
        handleUrlChange();
    });

    // YouTube's custom page data update event
    window.addEventListener('yt-page-data-updated', () => {
        otherTitlesLog('YouTube page data updated');
        handleUrlChange();
    });

    // YouTube's custom SPA navigation events
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
    
    // Clean up existing observers and set up new ones
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
    
    // refresh titles 10 seconds after URL change 
    setTimeout(() => {
        refreshOtherTitles();
    }, 10000);
    
    // Check if URL contains @username pattern
    const isChannelPage = window.location.pathname.includes('/@');
    if (isChannelPage) {
        // Handle all new channel page types (videos, featured, shorts, etc.)
        refreshOtherTitles();
        return;
    }
    
    switch(window.location.pathname) {
        case '/results': // Search page
            console.log(`${LOG_PREFIX}[URL] Detected search page`);
            waitForElement('#contents.ytd-section-list-renderer').then(() => {
                otherTitlesLog('Search results container found');
                refreshOtherTitles();
            });
            break;
        case '/': // Home page
            console.log(`${LOG_PREFIX}[URL] Detected home page`);
            waitForElement('#contents.ytd-rich-grid-renderer').then(() => {
                otherTitlesLog('Home page container found');
                refreshOtherTitles();
            });
            break;        
        case '/feed/subscriptions': // Subscriptions page
            console.log(`${LOG_PREFIX}[URL] Detected subscriptions page`);
            waitForElement('#contents.ytd-rich-grid-renderer').then(() => {
                otherTitlesLog('Subscriptions page container found');
                refreshOtherTitles();
            });
            break;
        case '/feed/trending':  // Trending page
        case '/playlist':  // Playlist page
        case '/channel':  // Channel page (old format)
        case '/watch': // Video page
            console.log(`${LOG_PREFIX}[URL] Detected video page`);
            waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then(() => {
                otherTitlesLog('Recommended videos container found');
                refreshOtherTitles();
                    // refresh titles 4 seconds after loading video page
                    setTimeout(() => {
                        refreshOtherTitles();
                    }, 40000);
            });
            break;
    }
}