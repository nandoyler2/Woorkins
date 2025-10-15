import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AIAssistantContextType {
  isOpen: boolean;
  openWithMessage: (message: string) => void;
  close: () => void;
  initialMessage: string | null;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const AIAssistantProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);

  const openWithMessage = (message: string) => {
    setInitialMessage(message);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setInitialMessage(null);
  };

  return (
    <AIAssistantContext.Provider value={{ isOpen, openWithMessage, close, initialMessage }}>
      {children}
    </AIAssistantContext.Provider>
  );
};

export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within AIAssistantProvider');
  }
  return context;
};
