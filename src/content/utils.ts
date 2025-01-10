const MUTATION_THRESHOLD = 10;

function isToggleMessage(message: unknown): message is Message {
    return (
        typeof message === 'object' &&
        message !== null &&
        'action' in message &&
        message.action === 'toggleTranslation' &&
        'feature' in message &&
        (message.feature === 'titles' || message.feature === 'audio') &&
        'isEnabled' in message &&
        typeof message.isEnabled === 'boolean'
    );
}

// Function to wait for an element to be present in the DOM
function waitForElement(selector: string, timeout = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector)!);
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector)!);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject('Timeout waiting for element');
        }, timeout);
    });
}