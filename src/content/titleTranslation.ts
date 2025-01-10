// Global variables
let processingTitleMutation = false;
let titleMutationCount = 0;
let titleObserver: MutationObserver | null = null;

const TITLE_LOG_STYLE = 'color: #93c5fd;';
const TITLE_LOG_CONTEXT = '[Title]';

function titleLog(message: string, ...args: any[]) {
    const formattedMessage = `${LOG_PREFIX}${TITLE_LOG_CONTEXT} ${message}`;
    console.log(`%c${formattedMessage}`, TITLE_LOG_STYLE, ...args);
}

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
        titleLog('Checking if element is processed:', hasElem);
        return hasElem;
    }

    setElement(element: HTMLElement, title: string): void {
        titleLog('Caching element with title:', title);
        this.processedElements.set(element, title);
    }

    async getOriginalTitle(url: string): Promise<string> {
        if (this.apiCache.has(url)) {
            titleLog('Using cached API response for:', url);
            return this.apiCache.get(url)!;
        }

        titleLog('Fetching new title from API:', url);
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.apiCache.set(url, data.title);
            titleLog('Received title from API:', data.title);
            return data.title;
        } catch (error) {
            console.error(`${LOG_PREFIX}${TITLE_LOG_CONTEXT} API request failed:`, error);
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
        titleLog('Processing main title element');
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId) {
            try {
                const originalTitle = await titleCache.getOriginalTitle(
                    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`
                );
                updateTitleElement(mainTitle, originalTitle);
                updatePageTitle(originalTitle);
            } catch (error) {
                console.error(`${LOG_PREFIX}${TITLE_LOG_CONTEXT} Failed to update main title:`, error);
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
    titleLog('Found recommended titles:', recommendedTitles.length);

    for (const titleElement of recommendedTitles) {
        if (!titleCache.hasElement(titleElement)) {
            titleLog('Processing recommended title:', titleElement.textContent);
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
                        console.error(`${LOG_PREFIX}${TITLE_LOG_CONTEXT} Failed to update recommended title:`, error);
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
    titleLog('Updating element with title:', title);
    
    // Check if the element already contains the original title
    if (element.textContent?.includes(title)) {
        titleLog('Title already present, cleaning up');
        element.textContent = title;  // Clean up any duplicate
    } else {
        element.textContent = title;
    }
    
    element.setAttribute('translate', 'no');
    element.style.setProperty('translate', 'no', 'important');
    titleCache.setElement(element, title);
}

function updatePageTitle(mainTitle: string): void {
    titleLog('Updating page title with:', mainTitle);
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
    // Observer for watch page
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        titleObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    refreshMainTitle();
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
        titleLog('Setting up recommended videos observer');
        const recommendedObserver = new MutationObserver(() => {
            refreshOtherTitles();
        });

        recommendedObserver.observe(contents, {
            childList: true
        });
    });

    // Observer for search results
    waitForElement('ytd-section-list-renderer #contents').then((contents) => {
        titleLog('Setting up search results observer');
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
    titleLog('Processing search results');
    
    // Select all untreated video titles
    const videoTitles = document.querySelectorAll('ytd-video-renderer #video-title:not([translate="no"])') as NodeListOf<HTMLAnchorElement>;
    
    titleLog('Found video titles:', videoTitles.length);

    for (const titleElement of videoTitles) {
        if (!titleCache.hasElement(titleElement)) {
            titleLog('Processing search result title:', titleElement.textContent);
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
                        console.error(`${LOG_PREFIX}${TITLE_LOG_CONTEXT} Failed to update search result title:`, error);
                    }
                }
            }
        }
    }
}

function setupUrlObserver() {
    titleLog('Setting up URL observer');
    
    // Listen for URL changes using History API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Override pushState
    history.pushState = function(...args) {
        titleLog('pushState called with:', args);
        originalPushState.apply(this, args);
        handleUrlChange();
    };

    // Override replaceState
    history.replaceState = function(...args) {
        titleLog('replaceState called with:', args);
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };

    // Listen for popstate event (back/forward browser buttons)
    window.addEventListener('popstate', () => {
        titleLog('popstate event triggered');
        handleUrlChange();
    });

    // Create an observer for the URL search params
    let lastSearch = window.location.search;
    const observer = new MutationObserver(() => {
        if (window.location.search !== lastSearch) {
            titleLog('Search params changed:', window.location.search);
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
    titleLog('[URL] Current pathname:', window.location.pathname);
    titleLog('[URL] Full URL:', window.location.href);
    
    // Check if URL contains @username pattern
    const isChannelPage = window.location.pathname.includes('/@');
    
    if (isChannelPage) {
        // Handle all new channel page types (videos, featured, shorts, etc.)
        refreshOtherTitles();
        return;
    }
    
    switch(window.location.pathname) {
        case '/results':
            titleLog('[URL] Detected search page');
            waitForElement('#contents.ytd-section-list-renderer').then(() => {
                titleLog('[URL] Search results container found');
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