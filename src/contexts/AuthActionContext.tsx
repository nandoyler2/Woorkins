import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthActionContextType {
  pendingAction: (() => void) | null;
  setPendingAction: (action: (() => void) | null) => void;
  showAuthDialog: boolean;
  setShowAuthDialog: (show: boolean) => void;
  requireAuth: (action: () => void) => boolean;
}

const AuthActionContext = createContext<AuthActionContextType | undefined>(undefined);

export function AuthActionProvider({ children }: { children: ReactNode }) {
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { user } = useAuth();

  const requireAuth = (action: () => void): boolean => {
    if (!user) {
      setPendingAction(() => action);
      setShowAuthDialog(true);
      return false;
    }
    
    return true;
  };

  return (
    <AuthActionContext.Provider
      value={{
        pendingAction,
        setPendingAction,
        showAuthDialog,
        setShowAuthDialog,
        requireAuth,
      }}
    >
      {children}
    </AuthActionContext.Provider>
  );
}

export function useAuthAction() {
  const context = useContext(AuthActionContext);
  if (context === undefined) {
    throw new Error('useAuthAction must be used within an AuthActionProvider');
  }
  return context;
}
