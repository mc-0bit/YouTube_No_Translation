// Main function to handle audio translation
async function handleAudioTranslation(isEnabled: boolean) {
    console.log(
        '%c[Extension-Debug][Audio] handleAudioTranslation called with isEnabled:', 
        'color: #86efac;', 
        isEnabled
    );
    
    if (!isEnabled) {
        console.log(
            '%c[Extension-Debug][Audio] Audio translation prevention disabled, exiting',
            'color: #86efac;'
        );
        return;
    }

    // Get the YouTube player
    const player = document.getElementById('movie_player');
    if (!player) {
        console.log(
            '%c[Extension-Debug][Audio] Player not found',
            'color: #86efac;'
        );
        return;
    }

    try {
        // Click settings button
        const settingsButton = document.querySelector('button.ytp-button.ytp-settings-button');
        if (!settingsButton) {
            throw new Error('Settings button not found');
        }
        (settingsButton as HTMLElement).click();

        // Wait for menu to appear and click audio track option
        await new Promise(resolve => setTimeout(resolve, 100));
        const audioTrackButton = document.querySelector('.ytp-audio-menu-item');
        if (!audioTrackButton) {
            (settingsButton as HTMLElement).click(); // Close settings if no audio option
            throw new Error('Audio track button not found');
        }
        (audioTrackButton as HTMLElement).click();

        // Wait for submenu and select original audio
        await new Promise(resolve => setTimeout(resolve, 100));
        const audioOptions = document.querySelectorAll('.ytp-menuitem-label');
        let found = false;
        for (const option of audioOptions) {
            if (option.textContent?.toLowerCase().includes('original')) {
                (option as HTMLElement).click();
                found = true;
                break;
            }
        }

        // Close settings menu
        (settingsButton as HTMLElement).click();

        console.log(
            `%c[Extension-Debug][Audio] ${found ? 'Successfully set original audio' : 'Original audio option not found'}`,
            'color: #86efac;'
        );
    } catch (error) {
        console.error(
            '%c[Extension-Debug][Audio] Error setting audio track:',
            'color: #86efac;',
            error
        );
    }
}

// Initialize function
function initializeAudioTranslation() {
    console.log(
        '%c[Extension-Debug][Audio] Initializing audio translation prevention',
        'color: #86efac; font-weight: bold;'
    );
    
    // Initial setup
    browser.storage.local.get('settings').then((data: Record<string, any>) => {
        const isEnabled = data.settings?.audioTranslation ?? false;
        handleAudioTranslation(isEnabled);
    });

    // Message handler
    browser.runtime.onMessage.addListener((message: unknown) => {
        if (isToggleMessage(message) && message.feature === 'audio') {
            handleAudioTranslation(message.isEnabled);
        }
        return true;
    });
}
