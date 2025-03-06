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

    const subtitlesLog = createLogger(LOG_STYLES.SUBTITLES);

    function setOriginalSubtitles() {
        const player = document.getElementById('movie_player');
        if (!player) return false;

        try {
            // Get current track - if no track, subtitles are disabled
            const currentTrack = player.getOption('captions', 'track');
            if (!currentTrack) return true; // No captions enabled, nothing to do

            // Get video response to access caption tracks
            const response = player.getPlayerResponse();
            const captionTracks = response.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!captionTracks) return false;

            // Find ASR track to determine original language
            const asrTrack = captionTracks.find(track => track.kind === 'asr');
            if (!asrTrack) return false;

            // Find manual track in original language
            const originalTrack = captionTracks.find(track => 
                track.languageCode === asrTrack.languageCode && !track.kind
            );

            // If no manual track in original language exists
            if (!originalTrack) {
                subtitlesLog('No manual track in original language, disabling subtitles');
                player.setOption('captions', 'track', {}); // Disable subtitles
                return true;
            }

            // If current track is already the original manual track, do nothing
            if (currentTrack.languageCode === asrTrack.languageCode && !currentTrack.kind) {
                subtitlesLog(`Subtitles are already in original language: "${currentTrack.languageName}"`);
                return true;
            }

            // Apply original manual track
            subtitlesLog(`Setting subtitles from "${currentTrack.languageName}" to original language "${originalTrack.name.simpleText}"`);
            player.setOption('captions', 'track', originalTrack);
            return true;

        } catch (error) {
            subtitlesLog('Error:', error);
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
            
            const success = setOriginalSubtitles();
            if (success) {
                processingVideoId = null;
            } else if (!initialSetupDone) {
                initialSetupDone = true;
                setTimeout(() => {
                    setOriginalSubtitles();
                    processingVideoId = null;
                }, 200);
            }
        });

        // Initial setup
        setOriginalSubtitles();
        initialSetupDone = true;
    }
})();