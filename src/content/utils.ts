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