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


/**
 * Handles YouTube's subtitles selection to force original language
 * 
 * YouTube provides different types of subtitle tracks:
 * - ASR (Automatic Speech Recognition) tracks: Always in original video language
 * - Manual tracks: Can be original or translated
 * - Translated tracks: Generated from manual tracks
 * 
 * Strategy:
 * 1. Find ASR track to determine original video language
 * 2. Look for manual track in same language
 * 3. Apply original language track if found
 */


(() => {
    const LOG_PREFIX = '[YNT]';
    const LOG_STYLES = {
        SUBTITLES: { context: '[SUBTITLES]', color: '#FF9800' }
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

    const subtitlesLog = createLogger(LOG_STYLES.SUBTITLES);
    const subtitlesErrorLog = createErrorLogger(LOG_STYLES.SUBTITLES);


    function setPreferredSubtitles() {
        const player = document.getElementById('movie_player');
        if (!player) return false;

        // Get language preference from localStorage
        const subtitlesLanguage = localStorage.getItem('subtitlesLanguage') || 'original';
        subtitlesLog(`Using preferred language: ${subtitlesLanguage}`);

        try {
            // Get video response to access caption tracks
            const response = player.getPlayerResponse();
            const captionTracks = response.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!captionTracks) return false;

            // If preference is "original", look for original language
            if (subtitlesLanguage === 'original') {
                // Find ASR track to determine original language
                const asrTrack = captionTracks.find(track => track.kind === 'asr');
                if (!asrTrack) {
                    subtitlesLog('Cannot determine original language, disabling subtitles');
                    player.setOption('captions', 'track', {});
                    return true;
                }

                // Find manual track in original language
                const originalTrack = captionTracks.find(track => 
                    track.languageCode === asrTrack.languageCode && !track.kind
                );

                // If no manual track in original language exists
                if (!originalTrack) {
                    subtitlesLog('No manual track in original language, disabling subtitles');
                    player.setOption('captions', 'track', {});
                    return true;
                }

                subtitlesLog(`Setting subtitles to original language: "${originalTrack.name.simpleText}"`);
                player.setOption('captions', 'track', originalTrack);
                return true;
            } 
            
            // For specific language preference, search for matching track
            const languageTrack = captionTracks.find(track => 
                track.languageCode === subtitlesLanguage && !track.kind
            );
            
            if (languageTrack) {
                subtitlesLog(`Setting subtitles to selected language: "${languageTrack.name.simpleText}"`);
                player.setOption('captions', 'track', languageTrack);
                return true;
            } else {
                subtitlesLog(`Selected language "${subtitlesLanguage}" not available, disabling subtitles`);
                player.setOption('captions', 'track', {});
                return true;
            }
        } catch (error) {
            subtitlesErrorLog(`${error.name}: ${error.message}`);
            return false;
        }
    }

    const player = document.getElementById('movie_player');
    if (player) {
        let processingVideoId = null;
        let initialSetupDone = false;

        player.addEventListener('onVideoDataChange', () => {
            const videoId = new URLSearchParams(window.location.search).get('v');
            if (videoId === processingVideoId) return;
            
            processingVideoId = videoId;
            subtitlesLog('Video data changed, checking subtitles...');
            
            const success = setPreferredSubtitles();
            if (success) {
                processingVideoId = null;
            } else if (!initialSetupDone) {
                initialSetupDone = true;
                setTimeout(() => {
                    setPreferredSubtitles();
                    processingVideoId = null;
                }, 200);
            }
        });

        // Initial setup
        setPreferredSubtitles();
        initialSetupDone = true;
    }
})();