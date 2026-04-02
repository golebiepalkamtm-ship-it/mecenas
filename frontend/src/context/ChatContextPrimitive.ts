import { createContext } from 'react';
import { useChat } from '../hooks';

type ChatContextType = ReturnType<typeof useChat>;

export const ChatContext = createContext<ChatContextType | undefined>(undefined);
