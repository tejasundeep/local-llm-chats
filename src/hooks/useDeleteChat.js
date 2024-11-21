import { useCallback } from 'react';
import { DEFAULT_TITLE, WELCOME_MESSAGE, generateUniqueId } from '@/utils/constants';

/**
 * Hook for managing chat deletion
 * @param {Object} params
 * @param {Function} params.setChats - Function to update chats state
 * @param {Function} params.setActiveChat - Function to update active chat state
 * @param {string} params.activeChat - Current active chat ID
 * @param {Array} params.chats - Array of all chats
 * @param {Function} params.saveToLocalStorage - Function to save to localStorage
 * @param {Function} params.generateUniqueId - Function to generate unique ID
 * @param {string} params.DEFAULT_TITLE - Default title for new chat
 * @param {string} params.WELCOME_MESSAGE - Welcome message for new chat
 */
export const useDeleteChat = ({
    setChats,
    setActiveChat,
    activeChat,
    chats,
    saveToLocalStorage,
    generateUniqueId,
    DEFAULT_TITLE,
    WELCOME_MESSAGE
}) => {
    const deleteChat = useCallback((chatId, e) => {
        if (e) {
            e.stopPropagation();
        }
        
        // Update chats using callback to ensure latest state
        setChats(prevChats => {
            const newChats = prevChats.filter(chat => chat.id !== chatId);
            
            // If this was the last chat, create a new one
            if (newChats.length === 0) {
                const newChat = {
                    id: generateUniqueId(),
                    title: DEFAULT_TITLE,
                    messages: [WELCOME_MESSAGE],
                    createdAt: new Date().toISOString()
                };
                newChats.push(newChat);
                setActiveChat(newChat.id);
            } else if (activeChat === chatId) {
                // If deleted chat was active, set first remaining chat as active
                setActiveChat(newChats[0].id);
            }
            
            saveToLocalStorage("chats", newChats);
            return newChats;
        });
    }, [activeChat, setActiveChat, setChats, saveToLocalStorage, generateUniqueId, DEFAULT_TITLE, WELCOME_MESSAGE]);

    return { deleteChat };
};
