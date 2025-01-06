declare const browser: typeof import('webextension-polyfill');

// Define storage data type
interface StorageData {
    isEnabled: boolean;
}

// Storage key for settings
const STORAGE_KEY = 'settings';

// Initial state
let isEnabled = false;

// Get toggle switch element
const toggleSwitch = document.getElementById('titleTranslation') as HTMLInputElement;

// Listen for toggle switch changes
toggleSwitch.addEventListener('change', async (event) => {
    const isChecked = (event.target as HTMLInputElement).checked;
    console.log(
        'Toggle state changed: %c%s',
        isChecked ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
        isChecked ? 'true' : 'false'
    );
    
    // Save state to storage
    try {
        await browser.storage.local.set({
            [STORAGE_KEY]: { isEnabled: isChecked } as StorageData
        });
        console.log('State saved');
    } catch (error) {
        console.error('Save error:', error);
    }
    
    // Send message to content script (to be implemented)
    try {
        await browser.tabs.query({ active: true, currentWindow: true });
        console.log('State updated');
    } catch (error) {
        console.error('Update error:', error);
    }
});

// Initialize toggle state from storage
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await browser.storage.local.get(STORAGE_KEY);
        const settings = data[STORAGE_KEY] as StorageData;
        isEnabled = settings?.isEnabled ?? false;
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