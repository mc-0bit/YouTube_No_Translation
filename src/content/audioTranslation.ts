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
    
    console.log('%c[Extension-Debug][Audio] Initializing audio translation prevention', 'color: #86efac;');
    
    injectScript(`
        function() {
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
            
            try {
                // 1. Get available audio tracks
                const tracks = player.getAvailableAudioTracks();
                
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
                    console.log('%c[Extension-Debug][Audio] Setting audio to original language: ' + languageName, 'color: #86efac;');
                    player.setAudioTrack(originalTrack);
                }
            } catch (error) {
                console.error('[YT-DEBUG] Error:', error);
            }
        }
    `);
}

function initializeAudioTranslation() {
    console.log(
        '%c[Extension-Debug][Audio] Initializing audio translation prevention',
        'color: #86efac; font-weight: bold;'
    );

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
