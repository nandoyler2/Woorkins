import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  document_verified: boolean;
  cpf: string | null;
}

interface BusinessProfile {
  id: string;
  company_name: string;
  category: string | null;
  logo_url: string | null;
  slug: string | null;
}

interface DashboardData {
  profile: Profile | null;
  businessProfiles: BusinessProfile[];
  woorkoinsBalance: number;
  availableBalance: number;
  evaluationsGiven: number;
  evaluationsReceived: number;
  followersCount: number;
  followingCount: number;
  unreadMessages: number;
  lastUnreadMessage: string;
  pendingInvitesCount: number;
  newProjectsCount: number;
  hasPostedStoryToday: boolean;
  lastUpdated: string;
}

interface DashboardCacheStore {
  data: DashboardData | null;
  setData: (data: Partial<DashboardData>) => void;
  updatePartial: (key: keyof DashboardData, value: any) => void;
  clearCache: () => void;
  isStale: () => boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useDashboardCache = create<DashboardCacheStore>()(
  persist(
    (set, get) => ({
      data: null,
      
      setData: (newData) => set((state) => ({
        data: {
          ...state.data,
          ...newData,
          lastUpdated: new Date().toISOString(),
        } as DashboardData
      })),
      
      updatePartial: (key, value) => set((state) => ({
        data: state.data ? {
          ...state.data,
          [key]: value,
          lastUpdated: new Date().toISOString(),
        } : null
      })),
      
      clearCache: () => set({ data: null }),
      
      isStale: () => {
        const { data } = get();
        if (!data?.lastUpdated) return true;
        
        const lastUpdate = new Date(data.lastUpdated).getTime();
        const now = Date.now();
        return (now - lastUpdate) > CACHE_DURATION;
      },
    }),
    {
      name: 'woorkins-dashboard-cache',
      partialize: (state) => ({ data: state.data }),
    }
  )
);
