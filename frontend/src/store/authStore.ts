import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user: any | null;
  profile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  setUser: (user: any) => void;
  loadProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  setUser: (user) => set({ user }),
  
  loadProfile: async (userId) => {
    try {
      // Use maybeSingle() to avoid 406 errors when profile is missing
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;

      if (!data) {
        // Automatically create a profile for new users as 'volunteer'
        // This prevents the application from breaking if the profile table is empty
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: userId, 
                full_name: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'متطوع جديد',
                role: 'volunteer' 
              }
            ])
            .select()
            .single();
            
          if (!createError) {
            set({ profile: newProfile });
          }
        }
      } else {
        set({ profile: data });
      }
    } catch (err) {
      console.error('Error in loadProfile:', err);
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

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (data?.user) {
      set({ user: data.user });
      await get().loadProfile(data.user.id);
    }
    
    return { data, error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));
