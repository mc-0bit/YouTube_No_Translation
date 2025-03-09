/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



(() => {
    const LOG_PREFIX = '[YNT]';
    const LOG_STYLES = {
        MAIN_TITLE: { context: '[MAIN TITLE]', color: '#fcd34d' }
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

    const mainTitleLog = createLogger(LOG_STYLES.MAIN_TITLE);
    const mainTitleErrorLog = createErrorLogger(LOG_STYLES.MAIN_TITLE);

    function getOriginalTitle() {
        const player = document.getElementById('movie_player');
        if (!player) {
            mainTitleLog('Player not found');
            window.dispatchEvent(new CustomEvent('ynt-title-data', {
                detail: { title: null }
            }));
            return;
        }

        try {
            const response = player.getPlayerResponse();
            // Debug logs
            //mainTitleLog('Player response:', response);            
            //mainTitleLog('Video details:', response?.videoDetails);
            
            const title = response?.videoDetails?.title;
            
            if (title) {
                mainTitleLog('Found title from player response:', title);
                window.dispatchEvent(new CustomEvent('ynt-title-data', {
                    detail: { title }
                }));
            } else {
                mainTitleLog('No title found in player response');
                window.dispatchEvent(new CustomEvent('ynt-title-data', {
                    detail: { title: null }
                }));
            }
        } catch (error) {
            mainTitleErrorLog(`${error.name}: ${error.message}`);
            window.dispatchEvent(new CustomEvent('ynt-title-data', {
                detail: { title: null }
            }));
        }
    }

    getOriginalTitle();
})();