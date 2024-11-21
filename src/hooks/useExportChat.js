/**
 * Hook for exporting chat messages to a file
 */
export const useExportChat = () => {
    const exportChat = (chat) => {
        if (!chat) return;

        const chatContent = chat.messages.map(msg => {
            const role = msg.sender === 'user' ? 'User' : 'Assistant';
            return `${role}: ${msg.text}`;
        }).join('\n\n');

        const blob = new Blob([chatContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chat.title || 'chat'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return { exportChat };
};
