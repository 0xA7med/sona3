import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user: any | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, fullName: string, phone?: string, zone?: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  setUser: (user: any) => void;
  loadProfile: (userId: string) => Promise<void>;
  updateRole: (role: string) => Promise<void>;
  setProfile: (profile: any) => void;
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
      set({ loading: true });
      
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

      try {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ id: userId, full_name: fullName, role: metaRole }])
          .select()
          .single();
          
        if (!createError && newProfile) {
          set({ profile: newProfile });
        } else {
          set({ profile: { id: userId, full_name: fullName, role: metaRole } });
        }
      } catch (insertErr) {
        set({ profile: { id: userId, full_name: fullName, role: metaRole } });
      }
    } catch (err: any) {
      console.error('Critical error in loadProfile:', err.message || err);
      set({ profile: { id: userId, role: 'volunteer' } });
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

    if (data?.session && data?.user) {
      set({ user: data.user });
      await get().loadProfile(data.user.id);
    }
    
    return { data, error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  updateRole: async (role: string) => {
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
