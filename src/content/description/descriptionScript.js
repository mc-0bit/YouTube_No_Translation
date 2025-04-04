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
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * As you can see below, the injected code only uses YouTube's official player API methods.
 */

(() => {
    const LOG_PREFIX = '[YNT]';
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

    // Create error logger function
    const ERROR_COLOR = '#F44336';  // Red

    function createErrorLogger(category) {
        return (message, ...args) => {
            console.log(
                `%c${LOG_PREFIX}${category.context} %c${message}`,
                `color: ${category.color}`,  // Keep category color for prefix
                `color: ${ERROR_COLOR}`,     // Red color for error message
                ...args
            );
        };
    }

    const descriptionLog = createLogger(LOG_STYLES.DESCRIPTION);
    const descriptionErrorLog = createErrorLogger(LOG_STYLES.DESCRIPTION);
    
    // Get player and video response
    const player = document.getElementById('movie_player');
    if (!player) {
        descriptionErrorLog('Player not found');
        window.dispatchEvent(new CustomEvent('ynt-description-data', {
            detail: { description: null }
        }));
        return;
    }

    const response = player.getPlayerResponse();
    const description = response?.videoDetails?.shortDescription;
    
    if (description) {
        //descriptionLog('Found description from player response');
        window.dispatchEvent(new CustomEvent('ynt-description-data', {
            detail: { description }
        }));
    } else {
        descriptionErrorLog('No description found in player response');
        window.dispatchEvent(new CustomEvent('ynt-description-data', {
            detail: { description: null }
        }));
    }
})();
