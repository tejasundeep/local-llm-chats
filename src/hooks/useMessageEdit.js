import { useState } from 'react';
import { generateUniqueId } from '../utils/constants';

/**
 * Hook for managing message editing functionality
 * @param {Object} params - Parameters for the hook
 * @param {function} params.setChats - Function to update chats
 * @param {function} params.setInput - Function to update input
 * @param {Object} params.inputRef - Reference to input element
 * @param {function} params.saveToLocalStorage - Function to save to local storage
 * @param {function} params.getCurrentChat - Function to get current chat
 * @param {function} params.setLoading - Function to set loading state
 * @param {function} params.setIsTyping - Function to set typing state
 * @param {Object} params.activeRequestsRef - Reference to active requests
 * @param {function} params.setError - Function to set error state
 * @returns {Object} Message editing functions and state
 */
export const useMessageEdit = ({
    setChats,
    setInput,
    inputRef,
    saveToLocalStorage,
    getCurrentChat,
    setLoading,
    setIsTyping,
    activeRequestsRef,
    setError
}) => {
    const [editingMessage, setEditingMessage] = useState(null);

    const handleMessageEdit = (messageIndex) => {
        const current = getCurrentChat();
        if (!current) return;
        
        const message = current.messages[messageIndex];
        if (message.sender === 'user') {
            setEditingMessage({ index: messageIndex, text: message.text });
            setInput(message.text);
            inputRef.current?.focus();
        }
    };

    const handleMessageUpdate = async (newText) => {
        if (!newText.trim()) return;

        const current = getCurrentChat();
        if (!current || !editingMessage) return;

        // Create new AbortController for this request
        const abortController = new AbortController();
        activeRequestsRef.current.add(abortController);

        try {
            setLoading(true);
            setIsTyping(true);  

            // Update the edited message and remove subsequent messages
            setChats(prevChats => {
                const updatedChats = prevChats.map(chat => {
                    if (chat.id === current.id) {
                        const updatedMessages = [...chat.messages];
                        // Update the user message
                        updatedMessages[editingMessage.index] = {
                            ...updatedMessages[editingMessage.index],
                            text: newText.trim(),
                            edited: true,
                            editedAt: new Date().toISOString()
                        };
                        // Remove all messages after the edited message
                        updatedMessages.length = editingMessage.index + 1;
                        return { ...chat, messages: updatedMessages };
                    }
                    return chat;
                });
                saveToLocalStorage("chats", updatedChats);
                return updatedChats;
            });

            // Get updated messages after state update
            const updatedChat = getCurrentChat();
            if (!updatedChat) throw new Error('Chat not found');

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: newText.trim(),
                    history: updatedChat.messages
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Add bot's response with typing effect
            const botMessage = {
                id: generateUniqueId(),
                sender: "bot",
                text: '',
                timestamp: new Date(),
                isTyping: true,
                fullText: data.response
            };

            // Add initial empty message to start typing effect
            setChats(prevChats => {
                const updatedChats = prevChats.map(chat => {
                    if (chat.id === current.id) {
                        return {
                            ...chat,
                            messages: [...chat.messages, botMessage]
                        };
                    }
                    return chat;
                });
                saveToLocalStorage("chats", updatedChats);
                return updatedChats;
            });

            // Simulate typing effect with debouncing
            let currentText = '';
            const words = data.response.split(' ');
            
            for (let i = 0; i < words.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 50)); // Debounce delay
                currentText += (i === 0 ? '' : ' ') + words[i];
                
                setChats(prevChats => {
                    const updatedChats = prevChats.map(chat => {
                        if (chat.id === current.id) {
                            const updatedMessages = [...chat.messages];
                            const lastMessageIndex = updatedMessages.length - 1;
                            updatedMessages[lastMessageIndex] = {
                                ...updatedMessages[lastMessageIndex],
                                text: currentText,
                                isTyping: i < words.length - 1
                            };
                            return { ...chat, messages: updatedMessages };
                        }
                        return chat;
                    });
                    if (i === words.length - 1) {
                        saveToLocalStorage("chats", updatedChats);
                    }
                    return updatedChats;
                });
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request aborted');
                return;
            }
            console.error('Error updating message:', error);
            setError({
                type: 'error',
                message: 'Failed to update message. Please try again.'
            });
        } finally {
            setLoading(false);
            setIsTyping(false);
            setEditingMessage(null);
            setInput('');
            activeRequestsRef.current.delete(abortController);
        }
    };

    const cancelMessageEdit = () => {
        setEditingMessage(null);
        setInput('');
    };

    return {
        editingMessage,
        handleMessageEdit,
        handleMessageUpdate,
        cancelMessageEdit
    };
};
