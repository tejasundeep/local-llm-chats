export const DEFAULT_TITLE = "New Chat";

export const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const WELCOME_MESSAGE = {
    id: generateUniqueId(),
    sender: "bot",
    text: "Hello! I'm your AI assistant powered by LLaMA. I'm here to help answer your questions and engage in conversation. How can I assist you today?",
    timestamp: new Date()
};
