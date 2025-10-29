import { create } from 'zustand';

interface Conversation {
  id: string;
  type: 'negotiation' | 'proposal';
  title: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: string;
  businessName?: string;
  projectId?: string;
  businessId?: string;
  freelancerId?: string;
  hasDispute?: boolean;
  disputeStatus?: string;
}

interface ConversationCacheStore {
  conversations: Conversation[];
  lastFetched: number | null;
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (id: string, type: 'negotiation' | 'proposal', updates: Partial<Conversation>) => void;
  getConversation: (id: string, type: 'negotiation' | 'proposal') => Conversation | undefined;
  clearCache: () => void;
  isStale: () => boolean;
}

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

// Load from localStorage on init
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem('conversation-cache');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        conversations: parsed.conversations || [],
        lastFetched: parsed.lastFetched || null,
      };
    }
  } catch (e) {
    console.error('Error loading cache:', e);
  }
  return { conversations: [], lastFetched: null };
};

const initialState = loadFromStorage();

export const useConversationCache = create<ConversationCacheStore>((set, get) => ({
  conversations: initialState.conversations,
  lastFetched: initialState.lastFetched,

  setConversations: (conversations: Conversation[]) => {
    const newState = {
      conversations,
      lastFetched: Date.now(),
    };
    set(newState);
    // Save to localStorage
    try {
      localStorage.setItem('conversation-cache', JSON.stringify(newState));
    } catch (e) {
      console.error('Error saving cache:', e);
    }
  },

  updateConversation: (id: string, type: 'negotiation' | 'proposal', updates: Partial<Conversation>) => {
    set((state) => {
      const newState = {
        ...state,
        conversations: state.conversations.map((conv) =>
          conv.id === id && conv.type === type
            ? { ...conv, ...updates }
            : conv
        ),
      };
      // Save to localStorage
      try {
        localStorage.setItem('conversation-cache', JSON.stringify({
          conversations: newState.conversations,
          lastFetched: newState.lastFetched,
        }));
      } catch (e) {
        console.error('Error saving cache:', e);
      }
      return newState;
    });
  },

  getConversation: (id: string, type: 'negotiation' | 'proposal') => {
    return get().conversations.find((c) => c.id === id && c.type === type);
  },

  clearCache: () => {
    set({ conversations: [], lastFetched: null });
    try {
      localStorage.removeItem('conversation-cache');
    } catch (e) {
      console.error('Error clearing cache:', e);
    }
  },

  isStale: () => {
    const { lastFetched } = get();
    if (!lastFetched) return true;
    return Date.now() - lastFetched > CACHE_DURATION;
  },
}));
