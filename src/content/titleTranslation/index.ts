/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


// Optimized cache manager
class TitleCache {
    private apiCache = new Map<string, string>();
    private lastCleanupTime = Date.now();
    private readonly MAX_ENTRIES = 500;
    private readonly CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes in ms

    private cleanupCache(): void {
        const currentTime = Date.now();
        
        // Clear if older than interval
        if (currentTime - this.lastCleanupTime > this.CLEANUP_INTERVAL) {
            titlesLog('Cache expired, clearing all entries');
            this.clear();
            this.lastCleanupTime = currentTime;
            return;
        }

        // Keep only most recent entries if over size limit
        if (this.apiCache.size > this.MAX_ENTRIES) {
            const entries = Array.from(this.apiCache.entries());
            this.apiCache = new Map(entries.slice(-this.MAX_ENTRIES));
            titlesLog('Cache size limit reached, keeping most recent entries');
        }
    }

    clear(): void {
        this.apiCache.clear();
        titlesLog('Cache cleared');
    }

    hasElement(element: HTMLElement): boolean {        
        return false;
    }

    setElement(element: HTMLElement, title: string): void {
        //titlesLog('Element caching disabled');
    }

    async getOriginalTitle(url: string): Promise<string> {
        this.cleanupCache();
        if (this.apiCache.has(url)) {
            //titlesLog('Using cached API response for:', url);
            return this.apiCache.get(url)!;
        }
        
        //titlesLog('Fetching new title from API:', url);
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.apiCache.set(url, data.title);
            //titlesLog('Received title from API:', data.title);
            return data.title;
        } catch (error) {
            //titlesLog(`API request failed, using title attribute as fallback:`, error);
            const videoElement = document.querySelector(`a[href*="${url.split('v=')[1]}"] #video-title`);
            return videoElement?.getAttribute('title') || '';
        }
    }
}

const titleCache = new TitleCache();