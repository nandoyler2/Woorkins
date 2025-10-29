import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useConversationCache = create<ConversationCacheStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      lastFetched: null,

      setConversations: (conversations: Conversation[]) => {
        set({
          conversations,
          lastFetched: Date.now(),
        });
      },

      updateConversation: (id: string, type: 'negotiation' | 'proposal', updates: Partial<Conversation>) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id && conv.type === type
              ? { ...conv, ...updates }
              : conv
          ),
        }));
      },

      getConversation: (id: string, type: 'negotiation' | 'proposal') => {
        return get().conversations.find((c) => c.id === id && c.type === type);
      },

      clearCache: () => {
        set({ conversations: [], lastFetched: null });
      },

      isStale: () => {
        const { lastFetched } = get();
        if (!lastFetched) return true;
        return Date.now() - lastFetched > CACHE_DURATION;
      },
    }),
    {
      name: 'conversation-cache',
      partialize: (state) => ({
        conversations: state.conversations,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
