const titleToggle = document.getElementById('titleTranslation') as HTMLInputElement;
const audioToggle = document.getElementById('audioTranslation') as HTMLInputElement;

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

// Initialize toggle states from storage
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        
        // Set title toggle state
        const isTitleEnabled = settings?.titleTranslation ?? false;
        titleToggle.checked = isTitleEnabled;
        
        // Set audio toggle state
        const isAudioEnabled = settings?.audioTranslation ?? false;
        audioToggle.checked = isAudioEnabled;
        
        console.log(
            '[NTM-Debug] Settings loaded - Title translation prevention is: %c%s',
            isTitleEnabled ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            isTitleEnabled ? 'ON' : 'OFF'
        );
        console.log(
            '[NTM-Debug] Settings loaded - Audio translation prevention is: %c%s',
            isAudioEnabled ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            isAudioEnabled ? 'ON' : 'OFF'
        );
    } catch (error) {
        console.error('Load error:', error);
    }
});