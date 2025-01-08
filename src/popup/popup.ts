const titleToggle = document.getElementById('titleTranslation') as HTMLInputElement;
const audioToggle = document.getElementById('audioTranslation') as HTMLInputElement;

// Initialize settings if they don't exist
async function initializeSettings() {
    const data = await browser.storage.local.get('settings');
    if (!data.settings) {
        await browser.storage.local.set({
            settings: DEFAULT_SETTINGS
        });
        console.log('[NTM-Debug] Settings initialized with default values');
    }
}

// Initialize toggle states from storage
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Ensure settings exist
        await initializeSettings();
        
        // Get settings
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        // Set toggle states
        titleToggle.checked = settings.titleTranslation;
        audioToggle.checked = settings.audioTranslation;
        
        console.log(
            '[NTM-Debug] Settings loaded - Title translation prevention is: %c%s',
            settings.titleTranslation ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.titleTranslation ? 'ON' : 'OFF'
        );
        console.log(
            '[NTM-Debug] Settings loaded - Audio translation prevention is: %c%s',
            settings.audioTranslation ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            settings.audioTranslation ? 'ON' : 'OFF'
        );
    } catch (error) {
        console.error('Load error:', error);
    }
});

// Handle title toggle changes
titleToggle.addEventListener('change', async () => {
    const isEnabled = titleToggle.checked;
    
    // Save state
    try {
        await browser.storage.local.set({
            settings: {
                titleTranslation: isEnabled,
                audioTranslation: audioToggle.checked
            }
        });
        console.log('Title state saved');
    } catch (error) {
        console.error('Title save error:', error);
    }

    // Update state
    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
            await browser.tabs.sendMessage(tabs[0].id, {
                action: 'toggleTranslation',
                feature: 'titles',
                isEnabled
            });
            console.log('Title state updated');
        }
    } catch (error) {
        console.error('Title update error:', error);
    }
});

// Handle audio toggle changes
audioToggle.addEventListener('change', async () => {
    const isEnabled = audioToggle.checked;
    
    // Save state
    try {
        await browser.storage.local.set({
            settings: {
                titleTranslation: titleToggle.checked,
                audioTranslation: isEnabled
            }
        });
        console.log('Audio state saved');
    } catch (error) {
        console.error('Audio save error:', error);
    }

    // Update state
    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
            await browser.tabs.sendMessage(tabs[0].id, {
                action: 'toggleTranslation',
                feature: 'audio',
                isEnabled
            });
            console.log('Audio state updated');
        }
    } catch (error) {
        console.error('Audio update error:', error);
    }
});