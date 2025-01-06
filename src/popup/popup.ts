const toggleSwitch = document.getElementById('titleTranslation') as HTMLInputElement;

// Handle toggle changes
toggleSwitch.addEventListener('change', async () => {
    const isEnabled = toggleSwitch.checked;
    
    // Save state
    try {
        await browser.storage.local.set({
            settings: {
                titleTranslation: isEnabled
            }
        });
        console.log('State saved');
    } catch (error) {
        console.error('Save error:', error);
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
            console.log('State updated');
        }
    } catch (error) {
        console.error('Update error:', error);
    }
});

// Initialize toggle state from storage
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings;
        const isEnabled = settings?.titleTranslation ?? false;
        toggleSwitch.checked = isEnabled;
        console.log(
            'Settings loaded - Translation prevention is: %c%s',
            isEnabled ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            isEnabled ? 'ON' : 'OFF'
        );
    } catch (error) {
        console.error('Load error:', error);
    }
});