/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */



const MUTATION_THRESHOLD = 10;

function isToggleMessage(message: unknown): message is Message {
    return (
        typeof message === 'object' &&
        message !== null &&
        'action' in message &&
        message.action === 'toggleTranslation' &&
        'feature' in message &&
        (
            message.feature === 'titles' || 
            message.feature === 'audio' || 
            message.feature === 'description' ||
            message.feature === 'subtitles'
        ) &&
        'isEnabled' in message &&
        typeof message.isEnabled === 'boolean'
    );
}

// Function to wait for an element to be present in the DOM
function waitForElement(selector: string, timeout = 7500): Promise<Element> {
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
            reject('Timeout waiting for element : ' + selector);
        }, timeout);
    });
}

// Function to normalize texts before comparison
function normalizeText(text: string | null | undefined, description = false): string {
    if (text === null || text === undefined) {
        return '';
    }
    
    let normalizedText = text;
    
    if (description) {
        // For descriptions, we need more aggressive normalization

        normalizedText = normalizedText.replace(/https?:\/\/(?:www\.)?[^\s]+/g, '');
        normalizedText = normalizedText.replace(/\/\s*@?[a-zA-Z0-9_-]+/g, '');
        normalizedText = normalizedText.replace(/@[a-zA-Z0-9_-]+/g, '');
        
        normalizedText = normalizedText.replace(/[^\w\s]/g, ''); // Remove punctuation and special characters
        normalizedText = normalizedText.replace(/\d+:\d+/g, '');  // Remove timestamps
        normalizedText = normalizedText.toLowerCase();            // Convert to lowercase
        
        //remove all non-alphanumeric characters
        normalizedText = normalizedText.replace(/[^a-z0-9]/g, '');
    }
    
    return normalizedText
        .normalize('NFD')  // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/\s+/g, ' ')  // Normalize spaces
        .replace(/[\p{Emoji}]/gu, '')  // Remove all emojis
        .trim();  // Remove leading/trailing spaces
}