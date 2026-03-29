import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/Toast';
import FamilyCard from '../components/FamilyCard';
import FamilyDetail from '../components/FamilyDetail';
import type { CaseAssignment, CaseLock, AssignmentStatus } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useOfflineStore } from '../store/offlineStore';

type FilterTab = 'all' | 'pending' | 'no_answer' | 'completed';

const TABS: { key: FilterTab; label: string; emoji: string }[] = [
  { key: 'all',       label: 'الكل',           emoji: '📋' },
  { key: 'pending',   label: 'لم تُنجز',        emoji: '⏳' },
  { key: 'no_answer', label: 'لم يردوا',        emoji: '📞' },
  { key: 'completed', label: 'مكتملة',          emoji: '✅' },
];

export default function VolunteerHome() {
  const { profile } = useAuthStore();
  const { addToSyncQueue, myAssignments, setMyAssignments } = useOfflineStore();
  const [globalAssignments, setGlobalAssignments] = useState<CaseAssignment[]>([]);
  const [locks,       setLocks]       = useState<Map<string, CaseLock>>(new Map());
  const [search,      setSearch]      = useState('');
  const [tab,         setTab]         = useState<FilterTab>('pending');
  const [loading,     setLoading]     = useState(true);
  const [isOffline,   setIsOffline]   = useState(!navigator.onLine);
  const [activeCamp,  setActiveCamp]  = useState<any>(null);
  const [selectedAsgn, setSelectedAsgn] = useState<CaseAssignment | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  useEffect(() => {
    const updateOnline = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  /* ── Fetch assignments ─────────────────────────────────── */
  const fetchCampaign = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        setActiveCamp(data);
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await fetchCampaign(); // Load campaign first
      
      const { data, error } = await supabase
        .from('case_assignments')
        .select(`
          *,
          family:families (
            id, sequential_id, mother_name, national_id,
            phone, governorate, district, social_status,
            has_chronic_illness, is_disabled, priority_score,
            status, notes, total_amount,
            children:children (id, is_orphan, school_stage, child_name, age)
          ),
          volunteer:profiles(full_name),
          campaign:campaigns(*)
        `)
        .order('status', { ascending: true });

      if (error) throw error;

      const enriched = (data ?? []).map((a) => ({
        ...a,
        family: a.family
          ? { ...a.family, _children_count: (a.family as any).children?.length ?? 0 }
          : undefined,
      }));

      setGlobalAssignments(enriched as CaseAssignment[]);
      
      // Update persistent offline cache for "My Tasks"
      const mine = (enriched as CaseAssignment[]).filter(a => a.volunteer_id === profile.id);
      setMyAssignments(mine);

    } catch (err) {
      console.error(err);
      toast('حدث خطأ في تحميل المهام، سيتم العرض من الذاكرة الحالية', 'warning');
    } finally {
      setLoading(false);
    }
  }, [profile, fetchCampaign, setMyAssignments]);

  /* ── Fetch locks snapshot ──────────────────────────────── */
  const fetchLocks = useCallback(async () => {
    const { data } = await supabase.from('case_locks').select('*');
    const map = new Map<string, CaseLock>();
    (data ?? []).forEach((l: CaseLock) => map.set(l.family_id, l));
    setLocks(map);
  }, []);

  /* ── Realtime subscription for locks ──────────────────── */
  useEffect(() => {
    if (!profile) return;

    fetchAssignments();
    fetchLocks();

    const ch = supabase
      .channel('case-locks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'case_locks',
      }, (payload) => {
        setLocks((prev) => {
          const next = new Map(prev);
          if (payload.eventType === 'DELETE') {
            next.delete((payload.old as CaseLock).family_id);
          } else {
            const lock = (payload.new as CaseLock);
            next.set(lock.family_id, lock);
            if (lock.locked_by !== profile.id) {
              toast(`🔒 ${lock.locked_by_name} يعمل على حالة الآن`, 'info', 2500);
            }
          }
          return next;
        });
      })
      .subscribe();

    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [profile, fetchAssignments, fetchLocks]);

  /* ── Cleanup own locks on unmount ──────────────────────── */
  useEffect(() => {
    return () => {
      // In this version, we handle locks via timeouts or manual release on close
      // Global assignment is the primary locking mechanism
    };
  }, []);

  /* ── Lock / unlock helpers ─────────────────────────────── */
  const lockCase = async (familyId: string) => {
    if (!profile || isOffline) return;
    try {
      await supabase.from('case_locks').upsert({
        family_id: familyId,
        locked_by: profile.id,
        locked_by_name: profile.full_name,
        locked_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Lock failed', e);
    }
  };

  const unlockCase = async (familyId: string) => {
    if (isOffline) return;
    await supabase.from('case_locks').delete().eq('family_id', familyId);
  };

  /* ── Quick Action handler ──────────────────────────────── */
  const handleAction = async (
    action: 'no_answer' | 'unreachable' | 'completed' | 'view' | 'claim',
    assignmentId: string
  ) => {
    if (!profile) return;

    if (action === 'claim') {
      if (isOffline) {
        toast('المعذرة، يجب أن تتوفر إنترنت للقيام بالحجز لأول مرة', 'warning');
        return;
      }
      try {
        const { error } = await supabase.rpc('reserve_single_case', {
           p_volunteer_id: profile.id,
           p_family_id: globalAssignments.find(a => a.id === assignmentId)?.family_id,
           p_campaign_id: activeCamp?.id
        });
        if (error) throw error;
        toast('✅ تم حجز الحالة لك بنجاح', 'success');
        fetchAssignments();
      } catch (err) {
        toast('❌ فشل الحجز، قد تكون محجوزة بالفعل', 'error');
      }
      return;
    }

    const asgn = globalAssignments.find(a => a.id === assignmentId) || myAssignments.find(a => a.id === assignmentId);
    if (!asgn || !asgn.family) return;

    const familyId = asgn.family_id;

    if (action === 'view') {
      if (!isOffline) lockCase(familyId);
      setSelectedAsgn(asgn);
      return;
    }

    const statusMap: Record<string, AssignmentStatus> = {
      no_answer:   'no_answer',
      unreachable: 'unreachable',
      completed:   'completed',
    };

    const newStatus = statusMap[action];
    if (!newStatus) return;

    // Build the payload
    const updatePayload = {
      id: assignmentId,
      status: newStatus,
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    };

    // Build the history payload
    const historyPayload = {
      family_id: familyId,
      user_id:   profile.id,
      user_name: profile.full_name,
      action_type: action === 'no_answer' ? 'CALLED_NO_ANSWER'
                 : action === 'unreachable' ? 'UNREACHABLE'
                 : 'TRANSFER_DONE',
      description: action === 'no_answer'   ? 'جرس ولم يرد'
                 : action === 'unreachable'  ? 'الرقم مغلق / تعذر التواصل'
                 : 'تم التحويل بنجاح وإتمام المهمة من المتطوع',
      campaign_id: asgn.campaign_id,
    };

    if (isOffline) {
      // Add to offline sync queue
      addToSyncQueue({ type: 'UPDATE_STATUS', payload: updatePayload });
      addToSyncQueue({ type: 'LOG_TRANSFER', payload: historyPayload });
      
      // Update local state immediately for UX
      const updated = (prev: CaseAssignment[]) => prev.map(a => a.id === assignmentId ? { ...a, status: newStatus as AssignmentStatus } : a);
      setGlobalAssignments(updated);
      setMyAssignments(updated(myAssignments));
      
      toast('💾 تم الحفظ محلياً - سيتم الرفع فور توفر نت', 'info');
      return;
    }

    try {
      const { error } = await supabase
        .from('case_assignments')
        .update(updatePayload)
        .eq('id', assignmentId);

      if (error) throw error;

      await supabase.from('case_history').insert(historyPayload);
      await unlockCase(familyId);

      fetchAssignments();
      toast('✅ تم التزامن بنجاح', 'success');

    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء التحديث، حاول مجدداً', 'error');
    }
  };

  /* ── Filter logic ──────────────────────────────────────── */
  const assignmentsToDisplay = isOffline ? myAssignments : globalAssignments;

  const filtered = assignmentsToDisplay.filter((a) => {
    const matchTab = tab === 'all' ? true
      : tab === 'pending'   ? ['pending', 'in_progress'].includes(a.status)
      : a.status === tab;

    const q = search.trim().toLowerCase();
    const matchSearch = !q || (
      a.family?.mother_name?.toLowerCase().includes(q)  ||
      a.family?.phone?.includes(q)                       ||
      a.family?.sequential_id?.toLowerCase().includes(q) ||
      a.family?.governorate?.includes(q)
    );

    return matchTab && matchSearch;
  });

  // Sort: My tasks first, then by priority
  const sorted = [...filtered].sort((a, b) => {
    if (a.volunteer_id === profile?.id && b.volunteer_id !== profile?.id) return -1;
    if (a.volunteer_id !== profile?.id && b.volunteer_id === profile?.id) return 1;
    return (b.family?.priority_score ?? 0) - (a.family?.priority_score ?? 0)
  });

  const completedCount = assignmentsToDisplay.filter(a => a.status === 'completed').length;
  const pendingCount   = assignmentsToDisplay.filter(a => ['pending', 'in_progress'].includes(a.status)).length;

  const handleBatchReserve = async () => {
    if (!profile || isOffline || !activeCamp) return;
    try {
       const { data, error } = await supabase.rpc('reserve_case_batch', {
          p_volunteer_id: profile.id,
          p_campaign_id: activeCamp.id,
          p_limit: 10
       });
       if (error) throw error;
       toast(`📦 تم حجز ${data?.length || 0} حالات جديدة لك بنجاح`, 'success');
       fetchAssignments();
    } catch (err) {
      toast('❌ فشل حجز الدفعة، تأكد من توفر حالات شاغرة', 'error');
    }
  };

  return (
    <div className="screen active" style={{ display: 'block' }}>
      {/* Loading Skeleton Over Header */}
      {loading && !activeCamp && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
        </div>
      )}

      {/* Campaign Banner */}
      <section className="section">
        <motion.div
          className="campaign-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div className="banner-icon-row">
            <div className="banner-icon-badge">
              {isOffline ? '📴 وضع الأوفلاين نشط' : `🎯 الحالات المتاحة: ${globalAssignments.length}`}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!isOffline && (
                <button 
                  className="btn btn-sm" 
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}
                  onClick={handleBatchReserve}
                >
                  📦 حجز 10 حالات
                </button>
              )}
              <button
                className="btn-ghost"
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={fetchAssignments}
                disabled={isOffline}
                title="تحديث"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          <div className="banner-title">
            {activeCamp?.name || (loading ? 'جارٍ تحميل الحملة...' : 'لا توجد حملة نشطة')}
          </div>
          <div className="banner-date">بمشاركة المتطوعة: {profile?.full_name}</div>
          
          <div className="progress-wrap mt-md">
            <div className="progress-labels">
              <span>{isOffline ? 'المهام المحفوظة بجهازك' : 'نسبة الإنجاز'}</span>
              <span>{assignmentsToDisplay.length ? Math.round((completedCount / assignmentsToDisplay.length) * 100) : 0}%</span>
            </div>
            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ width: `${assignmentsToDisplay.length ? (completedCount / assignmentsToDisplay.length) * 100 : 0}%` }}
              ></div>
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '6px', opacity: 0.8 }}>
              {completedCount} مكتملة من أصل {assignmentsToDisplay.length}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Search */}
      <section className="section" aria-label="بحث وفلترة">
        <div className="search-box mb-sm">
          <span className="search-box-icon">🔍</span>
          <input
            type="search"
            placeholder="ابحث بالاسم، الهاتف، أو رقم التسلسل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 40px 12px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--white)', outline: 'none' }}
          />
        </div>

        {/* Filter Chips */}
        <div className="filter-bar mb-md" role="group" aria-label="فلترة القائمة">
          {TABS.map(t => {
            const count = t.key === 'all' ? assignmentsToDisplay.length
              : t.key === 'pending' ? pendingCount
              : assignmentsToDisplay.filter(a => a.status === t.key).length;
            return (
              <button
                key={t.key}
                className={`filter-chip ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label} {t.emoji}
                {count > 0 && (
                  <span style={{
                    marginRight: '0.25rem',
                    background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'var(--primary-light)',
                    color: tab === t.key ? 'white' : 'var(--primary)',
                    padding: '2px 6px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Mothers List */}
      <section className="section" id="mothers-list" aria-label="قائمة الأمهات">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 160, background: '#e2e8f0', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />)}
          </div>
        ) : sorted.length === 0 ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--gray-600)' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              <CheckCircle size={48} style={{ margin: '0 auto', color: 'var(--green-light)' }} />
            </div>
            <p className="fw-700 text-lg">
              {tab === 'completed' ? '🎉 لم تُكمل أي مهمة بعد' : 'لا توجد مهام في هذا القسم'}
            </p>
            <p className="text-sm mt-sm">
              {search ? 'جرب بحثاً مختلفاً' : 'ستظهر هنا المهام المُسندة إليك'}
            </p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence mode="popLayout">
              {sorted.map((asgn, i) => (
                <FamilyCard
                  key={asgn.id}
                  assignment={asgn}
                  lock={locks.get(asgn.family_id) ?? null}
                  currentUserId={profile?.id}
                  onAction={handleAction}
                  showQuickActions={asgn.status !== 'completed'}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Family Detail Overlay */}
      {selectedAsgn && (
        <FamilyDetail
          isOpen={!!selectedAsgn}
          assignment={selectedAsgn}
          currentUserId={profile?.id}
          onClose={async () => {
             if (!isOffline) await unlockCase(selectedAsgn.family_id);
             setSelectedAsgn(null);
          }}
          onAction={(action) => handleAction(action, selectedAsgn.id)}
        />
      )}
    </div>
  );
}
