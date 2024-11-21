import { useCallback } from 'react';
import { DEFAULT_TITLE, WELCOME_MESSAGE, generateUniqueId } from '@/utils/constants';

/**
 * Hook for managing chat creation
 * @param {Object} params
 * @param {Function} params.setChats - Function to update chats state
 * @param {Function} params.setActiveChat - Function to update active chat state
 * @param {Function} params.saveToLocalStorage - Function to save to localStorage
 * @param {Function} params.setInput - Function to update input state
 * @param {React.RefObject} params.inputRef - Reference to input element
 */
export const useCreateChat = ({
    setChats,
    setActiveChat,
    saveToLocalStorage,
    setInput,
    inputRef
}) => {
    const createNewChat = useCallback(() => {
        const newChat = {
            id: generateUniqueId(),
            title: DEFAULT_TITLE,
            messages: [WELCOME_MESSAGE],
            createdAt: new Date().toISOString()
        };
        
        // Update chats using callback to ensure latest state
        setChats(prevChats => {
            try {
                const updatedChats = [...prevChats, newChat];
                saveToLocalStorage("chats", updatedChats);
                return updatedChats;
            } catch (error) {
                console.error('Error creating new chat:', error);
                return prevChats;
            }
        });
        
        setActiveChat(newChat.id);
        try {
            saveToLocalStorage("activeChat", newChat.id);
        } catch (error) {
            console.error('Error saving active chat:', error);
        }
        setInput("");
        inputRef.current?.focus();
    }, [setChats, setActiveChat, saveToLocalStorage, setInput, inputRef]);

    return { createNewChat };
};
