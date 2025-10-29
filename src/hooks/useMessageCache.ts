import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  status: string;
  media_url?: string;
  media_type?: string;
  [key: string]: any;
}

interface CachedConversation {
  messages: Message[];
  lastFetched: number;
}

interface MessageCacheStore {
  cache: Record<string, CachedConversation>;
  getMessages: (conversationId: string, conversationType: 'negotiation' | 'proposal') => Promise<Message[]>;
  addMessage: (conversationId: string, message: Message) => void;
  clearCache: (conversationId?: string) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Load from localStorage on init
const loadCacheFromStorage = () => {
  try {
    const stored = localStorage.getItem('message-cache');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading message cache:', e);
  }
  return {};
};

const initialCache = loadCacheFromStorage();

export const useMessageCache = create<MessageCacheStore>((set, get) => ({
  cache: initialCache,

  getMessages: async (conversationId: string, conversationType: 'negotiation' | 'proposal') => {
    const cacheKey = `${conversationType}-${conversationId}`;
    const cached = get().cache[cacheKey];
    const now = Date.now();

    // Retornar do cache se ainda válido
    if (cached && (now - cached.lastFetched) < CACHE_DURATION) {
      return cached.messages;
    }

    // Buscar do servidor
    const table = conversationType === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
    const idColumn = conversationType === 'negotiation' ? 'negotiation_id' : 'proposal_id';

    const { data, error } = await supabase
      .from(table as any)
      .select('*')
      .eq(idColumn, conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return cached?.messages || [];
    }

    const messages = data as any[] || [];

    // Atualizar cache
    const newCache = {
      ...get().cache,
      [cacheKey]: {
        messages,
        lastFetched: now,
      },
    };
    
    set({ cache: newCache });
    
    // Save to localStorage
    try {
      localStorage.setItem('message-cache', JSON.stringify(newCache));
    } catch (e) {
      console.error('Error saving message cache:', e);
    }

    return messages;
  },

  addMessage: (conversationId: string, message: Message) => {
    set((state) => {
      const cacheKey = conversationId;
      const cached = state.cache[cacheKey];

      if (!cached) return state;

      const newCache = {
        ...state.cache,
        [cacheKey]: {
          ...cached,
          messages: [...cached.messages, message],
        },
      };
      
      // Save to localStorage
      try {
        localStorage.setItem('message-cache', JSON.stringify(newCache));
      } catch (e) {
        console.error('Error saving message cache:', e);
      }

      return { cache: newCache };
    });
  },

  clearCache: (conversationId?: string) => {
    if (conversationId) {
      set((state) => {
        const newCache = { ...state.cache };
        delete newCache[conversationId];
        // Save to localStorage
        try {
          localStorage.setItem('message-cache', JSON.stringify(newCache));
        } catch (e) {
          console.error('Error saving message cache:', e);
        }
        return { cache: newCache };
      });
    } else {
      set({ cache: {} });
      try {
        localStorage.removeItem('message-cache');
      } catch (e) {
        console.error('Error clearing message cache:', e);
      }
    }
  },
}));
