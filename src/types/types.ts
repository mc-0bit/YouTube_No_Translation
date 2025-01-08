
interface Message {
    action: 'toggleTranslation';
    feature: 'titles' | 'audio' | 'description';
    isEnabled: boolean;
}

interface AudioTrack {
    id: string;
    K4: any;
    captionTracks: any[];
    S: any;
    V: any;
    xtags: string;
    W: boolean;
    T: any;
    C: string;
    captionsInitialState: string;
    [key: string]: any;
}

interface YouTubePlayer extends HTMLElement {
    getInternalApiInterface: () => string[];
    [key: string]: any;
}

interface ExtensionSettings {
    titleTranslation: boolean;
    audioTranslation: boolean;
}