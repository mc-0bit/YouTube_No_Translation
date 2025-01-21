/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's description data directly from the page context.
 * This is necessary because ytInitialPlayerResponse is not accessible from the content script context.
 * As you can see down below, the injected code only reads YouTube's data without any modifications.
 */

(() => {
    const LOG_PREFIX = '[NMT-Debug]';
    const LOG_STYLES = {
        DESCRIPTION: { context: '[DESCRIPTION]', color: '#2196F3' }
    };

    function createLogger(category) {
        return (message, ...args) => {
            console.log(
                `%c${LOG_PREFIX}${category.context} ${message}`,
                `color: ${category.color}`,
                ...args
            );
        };
    }

    const descriptionLog = createLogger(LOG_STYLES.DESCRIPTION);
    
    // Get current video ID from URL
    const currentVideoId = new URLSearchParams(window.location.search).get('v');
    descriptionLog('Current video ID:', currentVideoId);
    
    // Try to get description from the player API endpoint
    if (window.ytcfg && window.ytcfg.data_) {
        descriptionLog('Attempting to fetch with API key:', window.ytcfg.data_.INNERTUBE_API_KEY);
        fetch('/youtubei/v1/player?key=' + window.ytcfg.data_.INNERTUBE_API_KEY, {
            method: 'POST',
            body: JSON.stringify({
                videoId: currentVideoId,
                context: {
                    client: {
                        clientName: 'WEB',
                        clientVersion: window.ytcfg.data_.INNERTUBE_CLIENT_VERSION
                    }
                }
            })
        })
        .then(response => {
            descriptionLog('Got response:', response.status);
            return response.json();
        })
        .then(data => {
            descriptionLog('Got data:', data);
            const description = data?.videoDetails?.shortDescription;
            
            if (description) {
                descriptionLog('Found description from API for video:', currentVideoId);
                window.dispatchEvent(new CustomEvent('nmt-description-data', {
                    detail: { description }
                }));
            } else {
                descriptionLog('No description found in API response');
                window.dispatchEvent(new CustomEvent('nmt-description-data', {
                    detail: { description: null }
                }));
            }
        })
        .catch(error => {
            descriptionLog('Error fetching description:', error);
            window.dispatchEvent(new CustomEvent('nmt-description-data', {
                detail: { description: null }
            }));
        });
    } else {
        descriptionLog('window.ytcfg.data_ is not available');
        window.dispatchEvent(new CustomEvent('nmt-description-data', {
            detail: { description: null }
        }));
    }
})();
