
// Global variables
let processingTitleMutation = false;
let titleMutationCount = 0;
let titleObserver: MutationObserver | null = null;

// Optimized cache manager
class TitleCache {
    private processedElements = new WeakMap<HTMLElement, string>();
    private apiCache = new Map<string, string>();

    clear(): void {
        this.processedElements = new WeakMap<HTMLElement, string>();
        // We can keep the API cache as it's based on URLs
    }

    hasElement(element: HTMLElement): boolean {
        const hasElem = this.processedElements.has(element);
        otherTitlesLog('Checking if element is processed:', hasElem);
        return hasElem;
    }

    setElement(element: HTMLElement, title: string): void {
        otherTitlesLog('Caching element with title:', title);
        this.processedElements.set(element, title);
    }

    async getOriginalTitle(url: string): Promise<string> {
        if (this.apiCache.has(url)) {
            otherTitlesLog('Using cached API response for:', url);
            return this.apiCache.get(url)!;
        }

        otherTitlesLog('Fetching new title from API:', url);
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.apiCache.set(url, data.title);
            otherTitlesLog('Received title from API:', data.title);
            return data.title;
        } catch (error) {
            otherTitlesLog(`API request failed:`, error);
            throw error;
        }
    }
}

const titleCache = new TitleCache();

// Main Title Function
async function refreshMainTitle(): Promise<void> {
    const data = await browser.storage.local.get('settings');
    const settings = data.settings as ExtensionSettings;
    if (!settings?.titleTranslation) return;

    const mainTitle = document.querySelector('h1.ytd-watch-metadata > yt-formatted-string') as HTMLElement;
    if (mainTitle && window.location.pathname === '/watch' && !titleCache.hasElement(mainTitle)) {
        mainTitleLog('Processing main title element');
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId) {
            try {
                const originalTitle = await titleCache.getOriginalTitle(
                    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`
                );
                updateTitleElement(mainTitle, originalTitle);
                updatePageTitle(originalTitle);
            } catch (error) {
                mainTitleLog(`Failed to update main title:`, error);
            }
        }
    }
}

// Other Titles Function
async function refreshOtherTitles(): Promise<void> {
    const data = await browser.storage.local.get('settings');
    const settings = data.settings as ExtensionSettings;
    if (!settings?.titleTranslation) return;

    // Handle recommended video titles
    const recommendedTitles = document.querySelectorAll('#video-title') as NodeListOf<HTMLElement>;
    otherTitlesLog('Found recommended titles:', recommendedTitles.length);

    for (const titleElement of recommendedTitles) {
        if (!titleCache.hasElement(titleElement)) {
            otherTitlesLog('Processing recommended title:', titleElement.textContent);
            const videoUrl = titleElement.closest('a')?.href;
            if (videoUrl) {
                const videoId = new URLSearchParams(new URL(videoUrl).search).get('v');
                if (videoId) {
                    try {
                        const originalTitle = await titleCache.getOriginalTitle(
                            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`
                        );
                        updateTitleElement(titleElement, originalTitle);
                    } catch (error) {
                        otherTitlesLog(`Failed to update recommended title:`, error);
                    }
                }
            }
        }
    }

    // Handle search results
    await handleSearchResults();
}

// Utility Functions
function updateTitleElement(element: HTMLElement, title: string): void {
    otherTitlesLog('Updating element with title:', title);
    element.textContent = title;
    element.setAttribute('translate', 'no');
    element.removeAttribute('is-empty');
    titleCache.setElement(element, title);
}

function updatePageTitle(mainTitle: string): void {
        mainTitleLog('Updating page title with:', mainTitle);
    const channelName = document.querySelector('ytd-channel-name yt-formatted-string')?.textContent || '';
    document.title = `${mainTitle} - ${channelName} - YouTube`;
}

// Initialization
function initializeTitleTranslation() {
    browser.storage.local.get('settings').then((data: Record<string, any>) => {
        const settings = data.settings as ExtensionSettings;
        if (settings?.titleTranslation) {
            refreshMainTitle();
            refreshOtherTitles();
        }
    });
}

// Observers Setup
function setupTitleObserver() {
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        mainTitleLog('Setting up video-id observer');
        titleObserver = new MutationObserver(async (mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                        mainTitleLog('Video ID changed!');
                    titleCache.clear();
                    mainTitleLog('Cache cleared');
                    
                    const newVideoId = (mutation.target as HTMLElement).getAttribute('video-id');
                    mainTitleLog('New video ID:', newVideoId);
                    
                    // Get the current page URL to check against
                    const currentUrl = window.location.href;
                    mainTitleLog('Current URL:', currentUrl);
                    
                    // Wait for title element and monitor its changes
                    const titleElement = await waitForElement('ytd-watch-metadata yt-formatted-string.style-scope.ytd-watch-metadata');
                    let attempts = 0;
                    const maxAttempts = 20;
                    
                    while (attempts < maxAttempts) {
                        const pageUrl = window.location.href;
                        
                        if (pageUrl === currentUrl && titleElement.textContent && !titleElement.textContent.includes('Fight For')) {
                            mainTitleLog('Valid title found:', titleElement.textContent);
                            
                            browser.storage.local.get('settings').then(async (data: Record<string, any>) => {
                                const settings = data.settings as ExtensionSettings;
                                if (settings?.titleTranslation) {
                                    await refreshMainTitle();
                                    mainTitleLog('Title updated, new element:', titleElement.outerHTML);
                                }
                            });
                            break;
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 100));
                        attempts++;
                    }
                }
            }
        });

        titleObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });

    // Observer for home page
    waitForElement('#contents.ytd-rich-grid-renderer').then((contents) => {
        const gridObserver = new MutationObserver(() => {
            refreshOtherTitles();
        });

        gridObserver.observe(contents, {
            childList: true
        });
    });

    // Observer for recommended videos
    waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then((contents) => {
        otherTitlesLog('Setting up recommended videos observer');
        const recommendedObserver = new MutationObserver(() => {
            refreshOtherTitles();
        });

        recommendedObserver.observe(contents, {
            childList: true
        });
    });

    // Observer for search results
    waitForElement('ytd-section-list-renderer #contents').then((contents) => {
        otherTitlesLog('Setting up search results observer');
        const searchObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && 
                    mutation.addedNodes.length > 0 && 
                    mutation.target instanceof HTMLElement) {
                    const titles = mutation.target.querySelectorAll('#video-title');
                    if (titles.length > 0) {
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
    });
}

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
                    try {
                        const originalTitle = await titleCache.getOriginalTitle(
                            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`
                        );
                        updateTitleElement(titleElement, originalTitle);
                    } catch (error) {
                        otherTitlesLog(`Failed to update search result title:`, error);
                    }
                }
            }
        }
    }
}

function setupUrlObserver() {
    mainTitleLog('Setting up URL observer');
    
    // Listen for URL changes using History API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Override pushState
    history.pushState = function(...args) {
        mainTitleLog('pushState called with:', args);
        originalPushState.apply(this, args);
        handleUrlChange();
    };

    // Override replaceState
    history.replaceState = function(...args) {
        mainTitleLog('replaceState called with:', args);
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };

    // Listen for popstate event (back/forward browser buttons)
    window.addEventListener('popstate', () => {
        mainTitleLog('popstate event triggered');
        handleUrlChange();
    });

    // Create an observer for the URL search params
    let lastSearch = window.location.search;
    const observer = new MutationObserver(() => {
        if (window.location.search !== lastSearch) {
            mainTitleLog('Search params changed:', window.location.search);
            lastSearch = window.location.search;
            handleUrlChange();
        }
    });

    // Observe changes in the document title (YouTube updates it when search changes)
    const titleElement = document.querySelector('title');
    if (titleElement) {
        observer.observe(titleElement, {
            subtree: true,
            characterData: true,
            childList: true
        });
    }
}

function handleUrlChange() {
    console.log(`${LOG_PREFIX}[URL] Current pathname:`, window.location.pathname);
    console.log(`${LOG_PREFIX}[URL] Full URL:`, window.location.href);
    
    // Check if URL contains @username pattern
    const isChannelPage = window.location.pathname.includes('/@');
    
    if (isChannelPage) {
        // Handle all new channel page types (videos, featured, shorts, etc.)
        refreshOtherTitles();
        return;
    }
    
    switch(window.location.pathname) {
        case '/results':
            console.log(`${LOG_PREFIX}[URL] Detected search page`);
            waitForElement('#contents.ytd-section-list-renderer').then(() => {
                coreLog('Search results container found');
                handleSearchResults();
            });
            break;
        case '/':  // Home page
        case '/feed/subscriptions':  // Subscriptions page
        case '/feed/trending':  // Trending page
        case '/playlist':  // Playlist page
        case '/channel':  // Channel page (old format)
        case '/watch':  // Video page
            refreshOtherTitles();
            break;
    }
}