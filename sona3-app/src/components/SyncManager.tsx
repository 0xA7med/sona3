import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useOfflineStore } from '../store/offlineStore';
import { toast } from '../lib/toast';
import { logger } from '../lib/errorLogger';

export function SyncManager() {
  const { syncQueue, removeFromSyncQueue } = useOfflineStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(isSyncing);
  // eslint-disable-next-line react-hooks/refs
  isSyncingRef.current = isSyncing;

  async function processSyncQueue() {
    if (syncQueue.length === 0 || isSyncingRef.current) return;
    
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
        logger.error('Sync failed', { actionType: action.type, actionId: action.id, error: err });
      }
    }

    setIsSyncing(false);
    if (syncQueue.length === 0) {
      toast('✅ تم اكتمال التزامن بنجاح', 'success');
    }
  }

  const processSyncQueueRef = useRef(processSyncQueue);
  // eslint-disable-next-line react-hooks/refs
  processSyncQueueRef.current = processSyncQueue;

  useEffect(() => {
    const handleOnline = () => {
      logger.info('App is online. Starting sync...');
      processSyncQueueRef.current();
    };
    window.addEventListener('online', handleOnline);
    if (navigator.onLine) {
      const id = setTimeout(() => processSyncQueueRef.current(), 0);
      return () => { clearTimeout(id); window.removeEventListener('online', handleOnline); };
    }
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (navigator.onLine && syncQueue.length > 0 && !isSyncing) {
      const id = setTimeout(() => processSyncQueueRef.current(), 0);
      return () => clearTimeout(id);
    }
  }, [syncQueue.length, isSyncing]);

  return null;
}
