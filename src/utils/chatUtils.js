import { formatDistanceToNow } from 'date-fns';

const MAX_TITLE_LENGTH = 50;
const DEFAULT_TITLE = "New Chat";

/**
 * Generates a chat title from the first message
 * @param {string} message - The message to generate title from
 * @returns {string} - Generated title or default title
 */
export const generateChatTitle = (message) => {
    if (!message || typeof message !== 'string') return DEFAULT_TITLE;
    // Take the first line or first sentence, whichever is shorter
    const firstLine = message.split('\n')[0];
    const firstSentence = message.split(/[.!?]/)[0];
    const baseText = firstLine.length < firstSentence.length ? firstLine : firstSentence;
    
    // Clean and truncate the text
    return baseText
        .trim()
        .replace(/[^\w\s]/gi, ' ') // Replace special chars with space
        .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
        .substring(0, MAX_TITLE_LENGTH)
        .trim() || DEFAULT_TITLE;
};

export const MAX_MESSAGE_LENGTH = 4000;

/**
 * Copies text to clipboard and returns a promise
 * @param {string} text - Text to copy
 * @returns {Promise} - Resolves when copy is successful
 */
export const copyMessage = (text) => {
    return navigator.clipboard.writeText(text);
};

/**
 * Formats a timestamp into relative time
 * @param {string} timestamp - ISO timestamp to format
 * @returns {string} - Formatted relative time string
 */
export const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    try {
        return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch (error) {
        console.error('Error formatting relative time:', error);
        return '';
    }
};
