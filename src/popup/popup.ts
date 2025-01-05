declare const browser: typeof import('webextension-polyfill');

// Initial state (will be replaced with storage later)
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
    
    // Save state (to be implemented)
    isEnabled = isChecked;
    
    // Send message to content script (to be implemented)
    try {
        await browser.tabs.query({ active: true, currentWindow: true });
        console.log('State updated');
    } catch (error) {
        console.error('Update error:', error);
    }
});

// Initialize toggle state (to be implemented)
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded');
    toggleSwitch.checked = isEnabled;
});