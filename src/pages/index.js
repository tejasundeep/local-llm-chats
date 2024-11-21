import { useState, useEffect, useRef } from "react";
import MarkdownIt from "markdown-it";
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { Container, Row, Col, Button, Form, Nav, Navbar, Dropdown } from 'react-bootstrap';
import styles from "@/styles/Chat.module.css";
import { format } from 'date-fns';
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useExportChat } from "@/hooks/useExportChat";
import { useDeleteChat } from "@/hooks/useDeleteChat";
import { useCreateChat } from "@/hooks/useCreateChat";
import { useMessageEdit } from "@/hooks/useMessageEdit";
import { DEFAULT_TITLE, WELCOME_MESSAGE, generateUniqueId } from "@/utils/constants";
import { copyMessage, formatRelativeTime, MAX_MESSAGE_LENGTH, generateChatTitle } from "@/utils/chatUtils";
import { IoSend, IoAdd, IoTrash, IoMenu, IoClose, IoCopy, IoPencil, IoDownload, IoEllipsisVertical } from "react-icons/io5";

// Initialize markdown-it with basic configuration
const md = MarkdownIt('zero');  // Start with zero config

// Enable only the features we need
md.enable([
    'emphasis',
    'backticks',
    'blockquote',
    'code',
    'fence',
    'heading',
    'newline',
    'paragraph',
]);

// Configure code highlighting
md.options.highlight = function(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
        try {
            const highlighted = hljs.highlight(str, { language: lang }).value;
            return `<div class="${styles.codeWrapper}">
                <div class="${styles.codeHeader}">
                    <span class="${styles.codeLanguage}">${lang}</span>
                    <button class="${styles.codeCopyButton}" title="Copy code">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>                        
                    </button>
                </div>
                <pre class="${styles.codeBlock}"><code class="hljs language-${lang}">${highlighted}</code></pre>
            </div>`;
        } catch (err) {
            console.error('Failed to highlight:', err);
        }
    }
    
    return `<pre class="${styles.codeBlock}"><code>${md.utils.escapeHtml(str)}</code></pre>`;
};

// Safe text processing function
const processMessageText = (text) => {
    if (!text) return '';
    
    try {
        // Basic safety checks
        const sanitizedText = text
            .replace(/[^\S\r\n]+$/gm, '') // Trim trailing spaces
            .replace(/^\s+$/gm, ''); // Remove lines with only whitespace
        
        return md.render(sanitizedText);
    } catch (error) {
        console.error('Error rendering markdown:', error);
        return md.utils.escapeHtml(text); // Fallback to plain text
    }
};

// Typing Message Component
const TypingMessage = ({ text }) => {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!text) return;

        if (currentIndex < text.length) {
            const timeoutId = setTimeout(() => {
                setDisplayText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, 20); // Adjust speed here (lower = faster)

            return () => clearTimeout(timeoutId);
        }
    }, [text, currentIndex]);

    return (
        <div 
            className={styles.messageText}
            dangerouslySetInnerHTML={{ __html: processMessageText(displayText) }}
        />
    );
};

export default function Chat() {
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState("");
    const [error, setError] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const titleInputRef = useRef(null);
    const sidebarRef = useRef(null);
    const abortControllerRef = useRef(null);
    const activeRequestsRef = useRef(new Set());
    const tabIdRef = useRef(null);

    // Get current chat safely
    const getCurrentChat = () => {
        return chats.find(chat => chat.id === activeChat);
    };

    const { saveToLocalStorage, getFromLocalStorage } = useLocalStorage();
    const { exportChat: exportChatToFile } = useExportChat();
    const { deleteChat } = useDeleteChat({ 
        setChats, 
        setActiveChat, 
        activeChat, 
        chats, 
        saveToLocalStorage,
        generateUniqueId,
        DEFAULT_TITLE,
        WELCOME_MESSAGE
    });
    const { createNewChat } = useCreateChat({
        setChats,
        setActiveChat,
        saveToLocalStorage,
        setInput,
        inputRef
    });

    const {
        editingMessage,
        handleMessageEdit,
        handleMessageUpdate,
        cancelMessageEdit
    } = useMessageEdit({
        setChats,
        setInput,
        inputRef,
        saveToLocalStorage,
        getCurrentChat,
        setLoading,
        setIsTyping,
        activeRequestsRef,
        setError
    });

    // Function to get messages safely
    const getMessages = () => {
        const current = getCurrentChat();
        return current?.messages || [];
    };

    // Get tab-specific storage key
    const getTabStorageKey = () => `activeChat-${tabIdRef.current}`;

    // Generate a unique tab ID on mount
    useEffect(() => {
        if (!tabIdRef.current) {
            tabIdRef.current = `tab-${generateUniqueId()}`;
        }
    }, []);

    // Handle storage events from other tabs
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'chats') {
                try {
                    const newChats = getFromLocalStorage("chats");
                    setChats(newChats);
                } catch (error) {
                    console.error('Error parsing chats from storage:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Load chats and active chat from storage and URL
    useEffect(() => {
        try {
            const savedChats = getFromLocalStorage("chats");
            // Get chat ID from URL hash
            const urlChatId = window.location.hash.slice(1);
            
            if (savedChats) {
                const parsedChats = savedChats;
                // Validate chat structure
                const validChats = parsedChats.filter(chat => 
                    chat && 
                    typeof chat === 'object' && 
                    chat.id && 
                    Array.isArray(chat.messages)
                );
                
                // If no valid chats exist, create a new default chat
                if (validChats.length === 0) {
                    createNewChat();
                    return;
                }
                
                setChats(validChats);
                
                if (urlChatId && validChats.some(chat => chat.id === urlChatId)) {
                    // If URL has a chat ID, set it as active
                    setActiveChat(urlChatId);
                } else if (validChats.length > 0) {
                    // If no URL chat ID, set first chat as active
                    setActiveChat(validChats[0].id);
                    // Clear hash if it's the first chat
                    if (window.location.hash) {
                        window.history.replaceState(null, null, ' ');
                    }
                }
            } else {
                createNewChat();
            }
        } catch (error) {
            console.error('Error loading chats:', error);
            createNewChat();
        }
    }, []);

    // Update URL only for non-default chats
    useEffect(() => {
        if (!activeChat || !chats.length) return;
        
        // If it's the first chat, keep URL clean
        if (chats[0].id === activeChat) {
            if (window.location.hash) {
                window.history.replaceState(null, null, ' ');
            }
        } else {
            // For other chats, update URL with chat ID
            window.location.hash = activeChat;
        }
    }, [activeChat, chats]);

    // Save active chat to tab-specific storage
    useEffect(() => {
        if (!tabIdRef.current) return;

        if (activeChat) {
            saveToLocalStorage(getTabStorageKey(), activeChat);
        } else {
            saveToLocalStorage(getTabStorageKey(), null);
        }
    }, [activeChat]);

    // Cleanup tab-specific storage on unmount
    useEffect(() => {
        return () => {
            if (tabIdRef.current) {
                saveToLocalStorage(getTabStorageKey(), null);
            }
        };
    }, []);

    // Improved AbortController cleanup
    useEffect(() => {
        return () => {
            activeRequestsRef.current.forEach(controller => {
                try {
                    controller.abort();
                } catch (error) {
                    console.error('Error aborting request:', error);
                }
            });
            activeRequestsRef.current.clear();
        };
    }, []);

    // Improved scroll handling with debounce
    useEffect(() => {
        let timeoutId;
        const scrollToBottom = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        };

        if (getMessages()?.length) {
            // Clear any existing timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // Debounce scroll to prevent multiple scrolls
            timeoutId = setTimeout(scrollToBottom, 100);
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [getMessages()]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chats, activeChat]);

    useEffect(() => {
        // Handle copy button clicks
        const handleCopyClick = async (event) => {
            const button = event.target.closest(`.${styles.codeCopyButton}`);
            if (!button) return;

            try {
                const codeBlock = button.closest(`.${styles.codeWrapper}`).querySelector('code');
                const code = codeBlock.textContent;
                await navigator.clipboard.writeText(code);

                const originalContent = button.innerHTML;
                button.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                `;
                button.classList.add(styles.copied);

                setTimeout(() => {
                    button.innerHTML = originalContent;
                    button.classList.remove(styles.copied);
                }, 2000);
            } catch (err) {
                console.error('Failed to copy code:', err);
            }
        };

        document.addEventListener('click', handleCopyClick);
        return () => document.removeEventListener('click', handleCopyClick);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarRef.current && 
                !sidebarRef.current.contains(event.target) && 
                isSidebarOpen) {
                setIsSidebarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSidebarOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const current = getCurrentChat();
        if (!current || !Array.isArray(current.messages)) {
            setError({
                type: 'error',
                message: 'Invalid chat state. Please refresh the page.'
            });
            return;
        }

        if (editingMessage) {
            handleMessageUpdate(input.trim());
            return;
        }

        const userMessage = {
            id: generateUniqueId(),
            sender: 'user',
            text: input.trim(),
            timestamp: new Date()
        };

        // Create a new messages array to avoid mutation
        const updatedMessages = [...current.messages, userMessage];

        // Update chat state atomically
        setChats(prevChats => {
            const updatedChats = prevChats.map(chat => 
                chat.id === activeChat ? { 
                    ...chat, 
                    messages: updatedMessages, 
                    title: chat.messages.length === 0 || 
                        (chat.messages.length === 1 && chat.messages[0].id === WELCOME_MESSAGE.id) ||
                        chat.title === DEFAULT_TITLE ? 
                        generateChatTitle(userMessage.text) : chat.title 
                } : chat
            );
            saveToLocalStorage("chats", updatedChats);
            return updatedChats;
        });

        setInput('');
        setLoading(true);
        setIsTyping(true);

        // Create new AbortController for this request
        const abortController = new AbortController();
        activeRequestsRef.current.add(abortController);

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: input.trim(),
                    history: updatedMessages
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            const botMessage = {
                id: generateUniqueId(),
                sender: "bot",
                text: data.response,
                timestamp: new Date(),
                isTyping: true, // Only set for new messages
                isNew: true // Add this flag for new messages
            };

            setChats(prevChats => {
                const newChats = prevChats.map(chat =>
                    chat.id === activeChat
                        ? {
                            ...chat,
                            messages: [...chat.messages, botMessage]
                        }
                        : chat
                );
                // Remove isNew flag before saving to localStorage
                const storageChats = newChats.map(chat => ({
                    ...chat,
                    messages: chat.messages.map(msg => ({
                        ...msg,
                        isTyping: false,
                        isNew: false
                    }))
                }));
                saveToLocalStorage("chats", storageChats);
                return newChats;
            });

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Request aborted');
                return;
            }
            setError({
                type: 'error',
                message: `Failed to send message: ${err.message}`
            });
            console.error('Error:', err);
        } finally {
            setLoading(false);
            setIsTyping(false);
            activeRequestsRef.current.delete(abortController);
        }
    };

    const handleTitleEdit = () => {
        const current = getCurrentChat();
        if (current) {
            setEditingTitle(true);
            setEditedTitle(current.title);
            setTimeout(() => titleInputRef.current?.focus(), 0);
        }
    };

    const handleTitleSave = () => {
        if (!editedTitle.trim()) {
            setError({
                type: 'error',
                message: 'Title cannot be empty'
            });
            return;
        }

        setChats(prevChats => {
            try {
                const updatedChats = prevChats.map(chat => 
                    chat.id === activeChat ? { ...chat, title: editedTitle.trim() } : chat
                );
                saveToLocalStorage("chats", updatedChats);
                return updatedChats;
            } catch (error) {
                setError({
                    type: 'error',
                    message: 'Failed to save title. Please try again.'
                });
                return prevChats; // Revert on error
            }
        });
        
        setEditingTitle(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && editingMessage) {
            cancelMessageEdit();
        }
        // Rest of the handleKeyDown function...
    };

    const exportChat = () => {
        const current = getCurrentChat();
        if (!current) return;
        exportChatToFile(current);
    };

    return (
        <Container fluid className={styles.container} style={{ padding: 0 }}>
            <Row className="h-100 g-0">
                <Col xs="auto" className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`} ref={sidebarRef}>
                    <Navbar bg="dark" variant="dark" className={`${styles.sidebarHeader} p-3 border-bottom border-secondary`}>
                        <Button 
                            variant="dark"
                            className={`w-100 d-flex align-items-center justify-content-center gap-2 ${styles.newChatButton}`}
                            onClick={createNewChat}
                        >
                            <IoAdd className="fs-5" /> <span>New Chat</span>
                        </Button>
                    </Navbar>
                    
                    <div className={`${styles.chatListContainer} flex-grow-1 overflow-auto`}>
                        <Nav className={`flex-column ${styles.chatList}`}>
                            {chats.map((chat) => (
                                <Nav.Item key={chat.id} className={styles.chatItem}>
                                    <div className={`${styles.chatItemWrapper} position-relative`}>
                                        <Button
                                            variant="link"
                                            className={`w-100 text-start d-flex align-items-center py-2 px-3 ${styles.chatButton} ${chat.id === activeChat ? styles.active : ''}`}
                                            onClick={() => setActiveChat(chat.id)}
                                        >
                                            <div className="d-flex align-items-center gap-2 w-100">
                                                <div className={styles.chatIcon}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                                                    </svg>
                                                </div>
                                                <div className={styles.chatContent}>
                                                    {chat.id === activeChat && editingTitle ? (
                                                        <Form.Control
                                                            ref={titleInputRef}
                                                            type="text"
                                                            className={styles.titleInput}
                                                            value={editedTitle}
                                                            onChange={(e) => setEditedTitle(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleTitleSave();
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingTitle(false);
                                                                }
                                                            }}
                                                            onBlur={handleTitleSave}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <>
                                                            <p className={`fs-6 ${styles.chatTitle}`}>{chat.title || DEFAULT_TITLE}</p>
                                                            <p className={styles.chatPreview}>
                                                                {chat.messages[chat.messages.length - 1]?.text.substring(0, 60) || "No messages yet"}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </Button>
                                        {chat.id === activeChat && (
                                            <Dropdown className={styles.chatActions}>
                                                <Dropdown.Toggle variant="link" className={styles.moreButton}>
                                                    <IoEllipsisVertical />
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu variant="dark" align="end" className={styles.actionsMenu}>
                                                    <Dropdown.Item 
                                                        onClick={() => setEditingTitle(true)}
                                                        className="d-flex align-items-center gap-2"
                                                    >
                                                        <IoPencil /> Edit Title
                                                    </Dropdown.Item>
                                                    <Dropdown.Item 
                                                        onClick={() => exportChatToFile(chat)}
                                                        className="d-flex align-items-center gap-2"
                                                    >
                                                        <IoDownload /> Export Chat
                                                    </Dropdown.Item>
                                                    <Dropdown.Divider />
                                                    <Dropdown.Item 
                                                        onClick={() => deleteChat(chat.id)}
                                                        className="d-flex align-items-center gap-2 text-danger"
                                                    >
                                                        <IoTrash /> Delete Chat
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        )}
                                    </div>
                                </Nav.Item>
                            ))}
                        </Nav>
                    </div>
                </Col>
                <Col className={styles.main}>
                    <div className={styles.header}>
                        <Button 
                            className={styles.menuButton}
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            {isSidebarOpen ? <IoClose /> : <IoMenu />}
                        </Button>
                        <div className={styles.logo}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 1c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm1 3v2h-2V6h2zm0 4v6h-2v-6h2z"/>
                            </svg>
                            {editingTitle ? (
                                <div className={styles.titleEdit}>
                                    <input
                                        ref={titleInputRef}
                                        type="text"
                                        value={editedTitle}
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleTitleSave();
                                            } else if (e.key === 'Escape') {
                                                setEditingTitle(false);
                                            }
                                        }}
                                        onBlur={handleTitleSave}
                                        className={styles.titleInput}
                                        placeholder="Enter chat title..."
                                    />
                                </div>
                            ) : (
                                <h1 onClick={handleTitleEdit} className={styles.titleText}>
                                    {getCurrentChat()?.title || 'New Chat'}
                                </h1>
                            )}
                        </div>
                        <div className={styles.headerActions}>
                            <Button onClick={exportChat} className={styles.exportButton}>
                                <IoDownload /> Export
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className={`${styles.notification} ${styles[error.type]}`}>
                            {error.message}
                        </div>
                    )}

                    <div className={styles.messagesContainer}>
                        {activeChat && getMessages().map((message, index) => (
                            <div
                                key={message.id}
                                className={`${styles.messageWrapper} ${
                                    message.sender === 'user' ? styles.userMessage : ''
                                }`}
                            >
                                <div className={styles.messageContent}>
                                    <div className={styles.avatar}>
                                        {message.sender === 'user' ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                                <path d="M7.5 6.5C7.5 8.981 9.519 11 12 11s4.5-2.019 4.5-4.5S14.481 2 12 2 7.5 4.019 7.5 6.5zM20 21h1v-1c0-3.859-3.141-7-7-7h-4c-3.86 0-7 3.141-7 7v1h17z"/>
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 1c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm1 3v2h-2V6h2zm0 4v6h-2v-6h2z"/>
                                            </svg>
                                        )}
                                    </div>
                                    <div className={styles.messageBody}>
                                        <div className={styles.messageHeader}>
                                            <span className={styles.messageSender}>
                                                {message.sender === 'user' ? 'You' : 'LLaMA'}
                                            </span>
                                            <span className={styles.messageTime} title={format(message.timestamp, 'PPpp')}>
                                                {formatRelativeTime(message.timestamp)}
                                            </span>
                                            {message.edited && (
                                                <span className={styles.editedLabel}>
                                                    (edited)
                                                </span>
                                            )}
                                        </div>
                                        {message.isTyping ? (
                                            <TypingMessage text={message.text} />
                                        ) : (
                                            <div
                                                className={styles.messageText}
                                                dangerouslySetInnerHTML={{
                                                    __html: processMessageText(message.text)
                                                }}
                                            />
                                        )}
                                        <div className={styles.messageActions}>
                                            <Button
                                                className={styles.actionButton}
                                                onClick={() => copyMessage(message.text)}
                                                title="Copy message"
                                            >
                                                <IoCopy /> Copy
                                            </Button>
                                            {message.sender === 'user' && (
                                                <Button
                                                    className={styles.editButton}
                                                    onClick={() => handleMessageEdit(index)}
                                                    title="Edit message"
                                                >
                                                    <IoPencil /> Edit
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className={styles.typingIndicator}>
                                <div className={styles.typingDots}>
                                    <div className={styles.typingDot}></div>
                                    <div className={styles.typingDot}></div>
                                    <div className={styles.typingDot}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.inputContainer}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => {
                                if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                                    setInput(e.target.value);
                                    // Auto-adjust height
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (editingMessage) {
                                        handleMessageUpdate(input.trim());
                                    } else {
                                        handleSend();
                                    }
                                }
                            }}
                            placeholder={editingMessage ? "Edit your message..." : "Type your message... (Shift + Enter for new line)"}
                            className={styles.input}
                            rows={1}
                            disabled={loading}
                        />
                        <div className={styles.inputActions}>
                            <span className={styles.charCount}>
                                {input.length}/{MAX_MESSAGE_LENGTH}
                            </span>
                            <Button
                                className={styles.sendButton}
                                onClick={handleSend}
                                disabled={!input.trim() || loading || input.length > MAX_MESSAGE_LENGTH}
                                title="Send message"
                            >
                                <IoSend />
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}
