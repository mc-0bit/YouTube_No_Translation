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
 * This is necessary because the player response data is not accessible from the content script context.
 * As you can see below, the injected code only reads YouTube's data without any modifications.
 */


(() => {
    const LOG_PREFIX = '[YNT]';
    const LOG_STYLES = {
        CHANNEL_NAME: { context: '[CHANNEL NAME]', color: '#06b6d4' }
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

    const channelNameLog = createLogger(LOG_STYLES.CHANNEL_NAME);
    const channelNameErrorLog = createErrorLogger(LOG_STYLES.CHANNEL_NAME);

    function getOriginalChannelName() {
        // Try to get the specified player
        let targetId = 'movie_player';
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player';
        }
        const player = document.getElementById(targetId);
        
        if (!player) {
            channelNameLog('Player not found');
            window.dispatchEvent(new CustomEvent('ynt-channel-data', {
                detail: { channelName: null }
            }));
            return;
        }

        try {
            const response = player.getPlayerResponse();
            
            // Get the original channel name from ownerChannelName
            const channelName = response?.microformat?.playerMicroformatRenderer?.ownerChannelName;
            
            if (channelName) {
                //channelNameLog('Found channel name from player response:', channelName);
                window.dispatchEvent(new CustomEvent('ynt-channel-data', {
                    detail: { channelName }
                }));
            } else {
                channelNameLog('No channel name found in player response');
                window.dispatchEvent(new CustomEvent('ynt-channel-data', {
                    detail: { channelName: null }
                }));
            }
        } catch (error) {
            channelNameErrorLog(`${error.name}: ${error.message}`);
            window.dispatchEvent(new CustomEvent('ynt-channel-data', {
                detail: { channelName: null }
            }));
        }
    }

    getOriginalChannelName();
})();