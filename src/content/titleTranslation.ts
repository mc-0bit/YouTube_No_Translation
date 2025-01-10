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
        console.log('[Extension-Debug] Checking if element is processed:', hasElem);
        return hasElem;
    }

    setElement(element: HTMLElement, title: string): void {
        console.log('[Extension-Debug] Caching element with title:', title);
        this.processedElements.set(element, title);
    }

    async getOriginalTitle(url: string): Promise<string> {
        if (this.apiCache.has(url)) {
            console.log('[Extension-Debug] Using cached API response for:', url);
            return this.apiCache.get(url)!;
        }

        console.log('[Extension-Debug] Fetching new title from API:', url);
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.apiCache.set(url, data.title);
            console.log('[Extension-Debug] Received title from API:', data.title);
            return data.title;
        } catch (error) {
            console.error('[Extension-Debug] API request failed:', error);
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
        console.log('[Extension-Debug] Processing main title element');
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId) {
            try {
                const originalTitle = await titleCache.getOriginalTitle(
                    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`
                );
                updateTitleElement(mainTitle, originalTitle);
                updatePageTitle(originalTitle);
            } catch (error) {
                console.error('[Extension-Debug] Failed to update main title:', error);
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
    console.log('[Extension-Debug] Found recommended titles:', recommendedTitles.length);

    for (const titleElement of recommendedTitles) {
        if (!titleCache.hasElement(titleElement)) {
            console.log('[Extension-Debug] Processing recommended title:', titleElement.textContent);
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
                        console.error('[Extension-Debug] Failed to update recommended title:', error);
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
    console.log('[Extension-Debug] Updating element with title:', title);
    
    // Check if the element already contains the original title
    if (element.textContent?.includes(title)) {
        console.log('[Extension-Debug] Title already present, cleaning up');
        element.textContent = title;  // Clean up any duplicate
    } else {
        element.textContent = title;
    }
    
    element.setAttribute('translate', 'no');
    element.style.setProperty('translate', 'no', 'important');
    titleCache.setElement(element, title);
}

function updatePageTitle(mainTitle: string): void {
    console.log('[Extension-Debug] Updating page title with:', mainTitle);
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
    // Observer pour la page watch
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

    // Observer pour la page d'accueil
    waitForElement('#contents.ytd-rich-grid-renderer').then((contents) => {
        const gridObserver = new MutationObserver(() => {
            refreshOtherTitles();
        });

        gridObserver.observe(contents, {
            childList: true
        });
    });

    // Observer pour les vidéos recommandées
    waitForElement('#secondary-inner ytd-watch-next-secondary-results-renderer #items').then((contents) => {
        console.log('[Extension-Debug] Setting up recommended videos observer');
        const recommendedObserver = new MutationObserver(() => {
            refreshOtherTitles();
        });

        recommendedObserver.observe(contents, {
            childList: true
        });
    });
}

// Nouvelle fonction pour gérer les résultats de recherche
async function handleSearchResults(): Promise<void> {
    console.log('[Extension-Debug] Processing search results');
    
    // Sélectionner tous les titres de vidéos non traités
    const videoTitles = document.querySelectorAll('ytd-video-renderer #video-title:not([translate="no"])') as NodeListOf<HTMLAnchorElement>;
    
    console.log('[Extension-Debug] Found video titles:', videoTitles.length);

    for (const titleElement of videoTitles) {
        if (!titleCache.hasElement(titleElement)) {
            console.log('[Extension-Debug] Processing search result title:', titleElement.textContent);
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
                        console.error('[Extension-Debug] Failed to update search result title:', error);
                    }
                }
            }
        }
    }
}

function setupUrlObserver() {
    console.log('[Extension-Debug] Setting up URL observer');
    
    // Listen for URL changes using History API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Override pushState
    history.pushState = function(...args) {
        console.log('[Extension-Debug] pushState called with:', args);
        originalPushState.apply(this, args);
        handleUrlChange();
    };

    // Override replaceState
    history.replaceState = function(...args) {
        console.log('[Extension-Debug] replaceState called with:', args);
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };

    // Listen for popstate event (back/forward browser buttons)
    window.addEventListener('popstate', () => {
        console.log('[Extension-Debug] popstate event triggered');
        handleUrlChange();
    });

    // Create an observer for the URL search params
    let lastSearch = window.location.search;
    const observer = new MutationObserver(() => {
        if (window.location.search !== lastSearch) {
            console.log('[Extension-Debug] Search params changed:', window.location.search);
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
    console.log('[Extension-Debug][URL] Current pathname:', window.location.pathname);
    console.log('[Extension-Debug][URL] Full URL:', window.location.href);
    
    // Check if URL contains @username pattern
    const isChannelPage = window.location.pathname.includes('/@');
    
    if (isChannelPage) {
        // Handle all new channel page types (videos, featured, shorts, etc.)
        refreshOtherTitles();
        return;
    }
    
    switch(window.location.pathname) {
        case '/results':
            console.log('[Extension-Debug][URL] Detected search page');
            waitForElement('#contents.ytd-section-list-renderer').then(() => {
                console.log('[Extension-Debug][URL] Search results container found');
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