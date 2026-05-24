import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useOfflineStore } from '../store/offlineStore';
import { toast } from './Toast';

export function SyncManager() {
  const { syncQueue, removeFromSyncQueue } = useOfflineStore();
  const [isSyncing, setIsSyncing] = useState(false);

  async function processSyncQueue() {
    if (syncQueue.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    toast(`🔄 جاري مزامنة ${syncQueue.length} عملية معلقة...`, 'info');

    for (const action of syncQueue) {
      try {
        let success = false;
        
        switch (action.type) {
          case 'UPDATE_STATUS': {
            const { error } = await supabase
              .from('case_assignments')
              .update(action.payload)
              .eq('id', action.payload.id);
            if (!error) success = true;
            break;
          }
          case 'LOG_TRANSFER': {
             // In fact history or transaction record
             const { error } = await supabase
               .from('case_history')
               .insert(action.payload);
             if (!error) success = true;
             break;
          }
          case 'ADD_HISTORY': {
            const { error } = await supabase
               .from('case_history')
               .insert(action.payload);
             if (!error) success = true;
             break;
          }
        }

        if (success) {
          removeFromSyncQueue(action.id);
        }
      } catch (err) {
        console.error('Sync failed for action:', action, err);
        // We'll retry next time
      }
    }

    setIsSyncing(false);
    if (syncQueue.length === 0) {
      toast('✅ تم اكتمال التزامن بنجاح', 'success');
    }
  }

  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online. Starting sync...');
      processSyncQueue();
    };
    window.addEventListener('online', handleOnline);
    if (navigator.onLine) processSyncQueue();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (navigator.onLine && syncQueue.length > 0 && !isSyncing) {
      processSyncQueue();
    }
  }, [syncQueue.length, isSyncing]);

  return null;
}
