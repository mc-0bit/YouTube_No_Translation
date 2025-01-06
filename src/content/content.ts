console.log('Content script starting to load...');

// Define message type
interface Message {
    action: 'toggleTranslation';
    isEnabled: boolean;
}

// Listen for messages from popup
browser.runtime.onMessage.addListener((
    message: any,
    sender: any,
    sendResponse: (response?: any) => void
) => {
    console.log('Received message:', message);
    if (isToggleMessage(message)) {
        console.log(
            'Content script - Translation prevention: %c%s',
            message.isEnabled ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold',
            message.isEnabled ? 'ON' : 'OFF'
        );
        
        handleTitleTranslation(message.isEnabled);
    }
    return true;
});

// Type guard for Message
function isToggleMessage(message: any): message is Message {
    return (
        typeof message === 'object' &&
        message !== null &&
        'action' in message &&
        message.action === 'toggleTranslation' &&
        'isEnabled' in message &&
        typeof message.isEnabled === 'boolean'
    );
}

// Function to handle title translation
function handleTitleTranslation(isEnabled: boolean) {
    console.log('handleTitleTranslation called with:', isEnabled);
    
    // TODO: Implement title translation prevention
    // 1. Find all video title elements
    // 2. Store original titles
    // 3. Prevent/allow translation based on isEnabled
    
    console.log('Title translation handling not implemented yet');
}

console.log('Content script fully loaded');
