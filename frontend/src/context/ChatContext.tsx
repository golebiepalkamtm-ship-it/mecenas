import { type ReactNode } from 'react';
import { useChat } from '../hooks';
import { ChatContext } from './ChatContextPrimitive';

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const chat = useChat();
    return (
        <ChatContext.Provider value={chat}>
            {children}
        </ChatContext.Provider>
    );
};
