/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


async function handleSubtitlesTranslation() {   
    subtitlesLog('Initializing subtitles translation prevention');   
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/subtitles/subtitlesScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle subtitle language selection
browser.runtime.onMessage.addListener((message: unknown) => {
    subtitlesLog('Received message:', message); // Add debug log
    
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'subtitlesLanguage' &&
        'language' in message && typeof message.language === 'string') {
        
        // Store preference directly without JSON.stringify
        subtitlesLog(`Setting subtitle language preference to: ${message.language}`);
        localStorage.setItem('subtitlesLanguage', message.language);
        
        // Reapply subtitles if a video is currently playing
        handleSubtitlesTranslation();
    }
    return true;
});