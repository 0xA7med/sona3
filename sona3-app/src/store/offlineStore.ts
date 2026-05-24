import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CaseAssignment } from '../types';

interface PendingSyncAction {
  id: string; // Unique ID for the action
  type: 'UPDATE_STATUS' | 'LOG_TRANSFER' | 'ADD_HISTORY';
  payload: any;
  timestamp: string;
}

interface OfflineState {
  // Cached Data
  families: any[];
  myAssignments: CaseAssignment[];
  campaigns: any[];
  volunteers: any[];
  lastUpdated: string | null;

  // Sync Queue
  syncQueue: PendingSyncAction[];

  // Actions
  setFamilies: (families: any[]) => void;
  setMyAssignments: (assignments: CaseAssignment[]) => void;
  setCampaigns: (campaigns: any[]) => void;
  setVolunteers: (volunteers: any[]) => void;
  
  addToSyncQueue: (action: Omit<PendingSyncAction, 'id' | 'timestamp'>) => void;
  removeFromSyncQueue: (id: string) => void;
  clearSyncQueue: () => void;
  
  clearCache: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      families: [],
      myAssignments: [],
      campaigns: [],
      volunteers: [],
      lastUpdated: null,
      syncQueue: [],

      setFamilies: (families) => set({ families, lastUpdated: new Date().toISOString() }),
      setMyAssignments: (myAssignments) => set({ myAssignments, lastUpdated: new Date().toISOString() }),
      setCampaigns: (campaigns) => set({ campaigns }),
      setVolunteers: (volunteers) => set({ volunteers }),

      addToSyncQueue: (action) => set((state) => ({
        syncQueue: [
          ...state.syncQueue,
          {
            ...action,
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString()
          }
        ]
      })),

      removeFromSyncQueue: (id) => set((state) => ({
        syncQueue: state.syncQueue.filter(a => a.id !== id)
      })),

      clearSyncQueue: () => set({ syncQueue: [] }),
      
      clearCache: () => set({ 
        families: [], 
        myAssignments: [], 
        campaigns: [], 
        volunteers: [], 
        lastUpdated: null,
        syncQueue: []
      }),
    }),
    {
      name: 'sona3-offline-storage', // key in localStorage
    }
  )
);
