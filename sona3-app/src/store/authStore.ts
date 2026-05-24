import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types';

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: { message: string } | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string, zone?: string) => Promise<{ data: unknown; error: { message: string } | null }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  loadProfile: (userId: string) => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  
  loadProfile: async (userId) => {
    try {
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Database error fetching profile:', error.message);
        throw error;
      }

      if (data) {
        set({ profile: data });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No auth user found');

      const metaRole = user.app_metadata?.role || user.user_metadata?.role || 'volunteer';
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'متطوع جديد';
      const phone = user.user_metadata?.phone || null;
      const zone = user.user_metadata?.zone || null;

      try {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ id: userId, full_name: fullName, role: metaRole, phone, zone }])
          .select()
          .single();
          
        if (!createError && newProfile) {
          set({ profile: newProfile });
        } else {
          set({ profile: { id: userId, full_name: fullName, role: metaRole as UserRole, phone, zone, is_active: false, created_at: new Date().toISOString() } });
        }
      } catch {
        set({ profile: { id: userId, full_name: fullName, role: metaRole as UserRole, phone, zone, is_active: false, created_at: new Date().toISOString() } });
      }
    } catch (err: any) {
      console.error('Critical error in loadProfile:', err.message || err);
      set({ profile: { id: userId, full_name: 'متطوع جديد', role: 'volunteer' as UserRole, is_active: false, created_at: new Date().toISOString() } });
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (data?.user) {
      set({ user: data.user });
      await get().loadProfile(data.user.id);
    }
    
    return { data, error };
  },

  signUp: async (email, password, fullName, phone?: string, zone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: fullName,
          phone: phone,
          zone: zone
        }
      }
    });

    if (data?.user) {
      // Explicitly upsert the profile to guarantee that phone and zone are saved
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        phone: phone || null,
        zone: zone || null,
        // Optional fields that trigger might need
        is_active: false
      }, { onConflict: 'id' });

      if (data.session) {
        set({ user: data.user });
        await get().loadProfile(data.user.id);
      }
    }
    
    return { data, error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  updateRole: async (role: UserRole) => {
    const { profile } = get();
    if (!profile) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', profile.id);

    if (!error) {
      set({ profile: { ...profile, role } });
    } else {
      console.error('Failed to update role', error);
    }
  },

  setProfile: (profile) => set({ profile })
}));
