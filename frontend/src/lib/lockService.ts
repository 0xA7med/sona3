import { supabase } from './supabase';

export interface CaseLock {
  family_id: string;
  campaign_id: string;
  locked_by: string;
  locked_by_name?: string;
  locked_at: string;
  expires_at: string;
}

/**
 * Real-time Case Locking Service
 * Prevents multiple volunteers from handling the same family simultaneously.
 */
export const lockService = {
  /**
   * Tries to acquire a lock for a family
   */
  async acquireLock(familyId: string, campaignId: string, volunteerId: string): Promise<{ success: boolean; lockedBy?: string }> {
    // 1. Cleanup expired locks first (best effort)
    await supabase.rpc('cleanup_expired_locks');

    // 2. Try to insert lock
    const { error } = await supabase
      .from('case_locks')
      .insert({
        family_id: familyId,
        campaign_id: campaignId,
        locked_by: volunteerId,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
      });

    if (!error) return { success: true };

    // 3. If failed, it might be already locked. Fetch who has it.
    const { data: existing } = await supabase
      .from('case_locks')
      .select('locked_by')
      .eq('family_id', familyId)
      .single();

    if (existing?.locked_by === volunteerId) return { success: true };

    return { success: false, lockedBy: existing?.locked_by };
  },

  /**
   * Releases a lock
   */
  async releaseLock(familyId: string, volunteerId: string) {
    await supabase
      .from('case_locks')
      .delete()
      .match({ family_id: familyId, locked_by: volunteerId });
  },

  /**
   * Gets all active locks for a campaign
   */
  async getActiveLocks(campaignId: string): Promise<CaseLock[]> {
    const { data } = await supabase
      .from('case_locks')
      .select(`
        *,
        profile:profiles(full_name)
      `)
      .eq('campaign_id', campaignId);
    
    return (data || []).map(d => ({
      ...d,
      locked_by_name: (d as any).profile?.full_name
    }));
  }
};
