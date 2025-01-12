/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



/**
 * Handles YouTube's audio track selection to force original language
 * 
 * YouTube stores audio tracks in a specific format:
 * - Each track has an ID in the format: "251;BASE64_ENCODED_DATA"
 * - The BASE64_ENCODED_DATA contains track information including language code
 * - Track data is encoded as: "acont" (audio content) + "original"/"dubbed-auto" + "lang=XX-XX"
 * - Original track can be identified by "original" in its decoded data
 * 
 * Example of track ID:
 * "251;ChEKBWFjb250EghvcmlnaW5hbAoNCgRsYW5nEgVlbi1VUw"
 * When decoded: Contains "original" for original audio and "lang=en-US" for language

 * NOTE ON SCRIPT INJECTION :
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * As you can see down below, the injected code only uses YouTube's official player API methods.
 */


function injectScript(code: string) {
    const script = document.createElement('script');
    script.textContent = `(${code})();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
}

async function handleAudioTranslation(isEnabled: boolean) {
    if (!isEnabled) return;
    
    audioLog('Initializing audio translation prevention');
    
    injectScript(`
        function() {
            const LOG_PREFIX = '${LOG_PREFIX}';
            const LOG_STYLES = ${JSON.stringify(LOG_STYLES)};

            function createLogger(category) {
                return (message, ...args) => {
                    console.log(
                        \`%c\${LOG_PREFIX}\${category.context} \${message}\`,
                        \`color: \${category.color}\`,
                        ...args
                    );
                };
            }

            const audioLog = createLogger(LOG_STYLES.AUDIO);

            // Language mapping for common codes
            const languageNames = {
                'en': 'English',
                'es': 'Spanish',
                'fr': 'French',
                'de': 'German',
                'it': 'Italian',
                'pt': 'Portuguese',
                'ru': 'Russian',
                'ja': 'Japanese',
                'ko': 'Korean',
                'zh': 'Chinese'
            };

            const player = document.getElementById('movie_player');
            if (!player) return;
            
            function setOriginalTrack() {
                try {
                    const tracks = player.getAvailableAudioTracks();
                    audioLog('Available tracks:', tracks);
                    
                    // 2. Find original track by checking decoded content
                    const originalTrack = tracks.find(track => {
                        const base64Part = track.id.split(';')[1];
                        const decoded = atob(base64Part);
                        return decoded.includes('original');
                    });
                    
                    if (originalTrack) {
                        // Extract language code from base64 encoded track ID
                        const base64Part = originalTrack.id.split(';')[1];
                        const decoded = atob(base64Part);
                        const langMatch = decoded.match(/lang..([-a-zA-Z]+)/);
                        
                        // Get base language code (e.g., 'es' from 'es-US')
                        const langCode = langMatch ? langMatch[1].split('-')[0] : 'unknown';
                        
                        // Use the language name if available, otherwise use the language code
                        const languageName = languageNames[langCode] || langCode.toUpperCase();
                        
                        // 3. Set the audio track
                        audioLog('Setting audio to original language: ' + languageName);
                        player.setAudioTrack(originalTrack);
                    }
                } catch (error) {
                    console.error('[YT-DEBUG] Error:', error);
                }
            }

            // Listen for video data change
            player.addEventListener('onVideoDataChange', (data) => {
                audioLog('Video data changed, checking audio tracks...');
                setOriginalTrack();
            });
        }
    `);
}

function initializeAudioTranslation() {
    audioLog('Initializing audio translation prevention');

    // Initial setup
    browser.storage.local.get('settings').then((data: Record<string, any>) => {
        const settings = data.settings as ExtensionSettings;
        handleAudioTranslation(settings?.audioTranslation || false);
    });

    // Message handler
    browser.runtime.onMessage.addListener((message: unknown) => {
        if (isToggleMessage(message) && message.feature === 'audio') {
            handleAudioTranslation(message.isEnabled);
        }
        return true;
    });
}

let audioObserver: MutationObserver | null = null;

function setupAudioObserver() {
    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        audioObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    browser.storage.local.get('settings').then((data: Record<string, any>) => {
                        const settings = data.settings as ExtensionSettings;
                        if (settings?.audioTranslation) {
                            initializeAudioTranslation();
                        }
                    });
                }
            }
        });

        audioObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });
}
