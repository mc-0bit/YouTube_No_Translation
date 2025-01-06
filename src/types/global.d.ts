declare const browser: typeof import('webextension-polyfill');

interface ExtensionSettings {
    titleTranslation: boolean;
    descriptionTranslation?: boolean;
}
