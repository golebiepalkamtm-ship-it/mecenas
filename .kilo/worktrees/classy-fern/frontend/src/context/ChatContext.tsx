import { createContext, useContext, type ReactNode } from 'react';
import { useChat } from '../hooks';

type ChatContextType = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const chat = useChat();
    return (
        <ChatContext.Provider value={chat}>
            {children}
        </ChatContext.Provider>
    );
}

export function useSharedChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useSharedChat must be used within a ChatProvider');
    }
    return context;
}
