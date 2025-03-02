/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

/**
 * Handles YouTube's subtitles selection to force original language
 * 
 * YouTube provides different types of subtitle tracks:
 * - ASR (Automatic Speech Recognition) tracks: Always in original video language
 * - Manual tracks: Can be original or translated
 * - Translated tracks: Generated from manual tracks
 * 
 * Strategy:
 * 1. Find ASR track to determine original video language
 * 2. Look for manual track in same language
 * 3. Apply original language track if found
 */

async function handleSubtitlesTranslation() {   
    subtitlesLog('Initializing subtitles translation prevention');   
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/subtitlesTranslation/subtitlesScript.js');
    document.documentElement.appendChild(script);
}