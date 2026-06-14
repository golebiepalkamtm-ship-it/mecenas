import { useContext } from 'react';
import { ChatContext } from './ChatContextPrimitive';

export const useSharedChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useSharedChat must be used within a ChatProvider');
    }
    return context;
};
