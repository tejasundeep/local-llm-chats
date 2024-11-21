import { useState } from 'react';

export const useLocalStorage = () => {
    const [error, setError] = useState(null);

    const isValidJSON = (value) => {
        if (typeof value !== 'string') return false;
        try {
            JSON.parse(value);
            return true;
        } catch {
            return false;
        }
    };

    const safeJSONStringify = (value) => {
        try {
            return JSON.stringify(value);
        } catch (error) {
            console.error('Failed to stringify value:', error);
            // For values that can't be stringified (like circular references),
            // convert to a simple string representation
            return String(value);
        }
    };

    const saveToLocalStorage = (key, value) => {
        try {
            let serialized;
            if (typeof value === 'string') {
                // If it's already a valid JSON string, use it as is
                serialized = isValidJSON(value) ? value : safeJSONStringify(value);
            } else {
                serialized = safeJSONStringify(value);
            }
            
            const estimatedSize = new Blob([serialized]).size;
            
            // Check if we have enough space (5MB limit)
            if (estimatedSize > 5 * 1024 * 1024) {
                throw new Error('Storage quota would be exceeded');
            }
            
            localStorage.setItem(key, serialized);
        } catch (error) {
            console.error(`Storage error (${key}):`, error);
            
            // Handle quota exceeded
            if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                // Remove old chats until we have space
                try {
                    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
                    while (chats.length > 1) {
                        chats.shift(); // Remove oldest chat
                        try {
                            localStorage.setItem('chats', JSON.stringify(chats));
                            localStorage.setItem(key, typeof value === 'string' ? value : safeJSONStringify(value));
                            return;
                        } catch (e) {
                            continue;
                        }
                    }
                } catch (parseError) {
                    console.error('Failed to parse chats:', parseError);
                }
            }
            
            setError({
                type: 'error',
                message: 'Storage error - some data may not be saved'
            });
        }
    };

    const getFromLocalStorage = (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            if (!item) return defaultValue;
            
            // If it's a string that's not trying to be JSON, return as is
            if (item.startsWith('"') || item.startsWith('[') || item.startsWith('{')) {
                try {
                    return JSON.parse(item);
                } catch (parseError) {
                    console.error(`Failed to parse stored JSON for key ${key}:`, parseError);
                    return item; // Return raw string if parsing fails
                }
            }
            
            return item; // Return as is for non-JSON strings
        } catch (error) {
            console.error(`Error reading from localStorage (${key}):`, error);
            return defaultValue;
        }
    };

    return {
        saveToLocalStorage,
        getFromLocalStorage,
        error
    };
};
