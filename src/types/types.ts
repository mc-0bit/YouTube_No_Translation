
interface Message {
    action: 'toggleTranslation';
    feature: 'titles' | 'audio' | 'description';
    isEnabled: boolean;
}