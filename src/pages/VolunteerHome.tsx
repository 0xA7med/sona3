import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle, ArrowLeft, Calendar, Coins, ShoppingBag, Heart, Target, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/Toast';
import FamilyCard from '../components/FamilyCard';
import FamilyDetail from '../components/FamilyDetail';
import type { CaseAssignment, CaseLock, AssignmentStatus, Campaign, CampaignType } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useOfflineStore } from '../store/offlineStore';

type FilterTab = 'all' | 'pending' | 'no_answer' | 'completed';
type ViewState = 'selection' | 'tasks';

const TABS: { key: FilterTab; label: string; emoji: string }[] = [
  { key: 'all',       label: 'الكل',           emoji: '📋' },
  { key: 'pending',   label: 'لم تُنجز',        emoji: '⏳' },
  { key: 'no_answer', label: 'لم يردوا',        emoji: '📞' },
  { key: 'completed', label: 'مكتملة',          emoji: '✅' },
];

const TYPE_CONFIG: Record<CampaignType, { label: string; icon: any; color: string; bg: string }> = {
  financial:       { label: 'تحويل مالي', icon: Coins,       color: '#059664', bg: 'rgba(5, 150, 100, 0.1)' },
  food_basket:     { label: 'كرتونة طعام', icon: ShoppingBag, color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  clothing:        { label: 'كسوة / ملابس', icon: Heart,       color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
  school_supplies: { label: 'أدوات مدرسية', icon: Target,      color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  other:           { label: 'عام / أخرى',  icon: Info,       color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
};

export default function VolunteerHome() {
  const { profile } = useAuthStore();
  const { addToSyncQueue, myAssignments, setMyAssignments } = useOfflineStore();
  
  const [view, setView] = useState<ViewState>('selection');
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [selectedCamp, setSelectedCamp] = useState<Campaign | null>(null);
  const [globalAssignments, setGlobalAssignments] = useState<CaseAssignment[]>([]);
  const [locks,       setLocks]       = useState<Map<string, CaseLock>>(new Map());
  const [search,      setSearch]      = useState('');
  const [tab,         setTab]         = useState<FilterTab>('pending');
  const [loading,     setLoading]     = useState(true);
  const [isOffline,   setIsOffline]   = useState(!navigator.onLine);
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

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAllCampaigns(data || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      toast('حدث خطأ في تحميل الحملات', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async (campaignId: string) => {
    if (!profile) return;
    setLoading(true);
    try {
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
        .eq('campaign_id', campaignId)
        .order('status', { ascending: true });

      if (error) throw error;

      const enriched = (data ?? []).map((a) => ({
        ...a,
        family: a.family
          ? { ...a.family, _children_count: (a.family as any).children?.length ?? 0 }
          : undefined,
      }));

      setGlobalAssignments(enriched as CaseAssignment[]);
      
      const mine = (enriched as CaseAssignment[]).filter(a => a.volunteer_id === profile.id);
      setMyAssignments(mine);

    } catch (err) {
      console.error(err);
      toast('حدث خطأ في تحميل المهام', 'warning');
    } finally {
      setLoading(false);
    }
  }, [profile, setMyAssignments]);

  const fetchLocks = useCallback(async () => {
    const { data } = await supabase.from('case_locks').select('*');
    const map = new Map<string, CaseLock>();
    (data ?? []).forEach((l: CaseLock) => map.set(l.family_id, l));
    setLocks(map);
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchCampaigns();
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
          }
          return next;
        });
      })
      .subscribe();

    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [profile, fetchCampaigns, fetchLocks]);

  useEffect(() => {
    if (selectedCamp) {
      fetchAssignments(selectedCamp.id);
    }
  }, [selectedCamp, fetchAssignments]);

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

  const handleAction = async (
    action: 'no_answer' | 'unreachable' | 'completed' | 'view' | 'claim',
    assignmentId: string
  ) => {
    if (!profile || !selectedCamp) return;

    if (action === 'claim') {
      if (isOffline) {
        toast('المعذرة، يجب أن تتوفر إنترنت للقيام بالحجز', 'warning');
        return;
      }
      try {
        const { error } = await supabase.rpc('reserve_single_case', {
           p_volunteer_id: profile.id,
           p_family_id: globalAssignments.find(a => a.id === assignmentId)?.family_id,
           p_campaign_id: selectedCamp.id
        });
        if (error) throw error;
        toast('✅ تم حجز الحالة لك بنجاح', 'success');
        fetchAssignments(selectedCamp.id);
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

    const updatePayload = {
      id: assignmentId,
      status: newStatus,
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    };

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
      addToSyncQueue({ type: 'UPDATE_STATUS', payload: updatePayload });
      addToSyncQueue({ type: 'LOG_TRANSFER', payload: historyPayload });
      const updater = (prev: CaseAssignment[]) => prev.map(a => a.id === assignmentId ? { ...a, status: newStatus as AssignmentStatus } : a);
      setGlobalAssignments(updater);
      setMyAssignments(updater(myAssignments));
      toast('💾 تم الحفظ محلياً - سيتم الرفع فور توفر نت', 'info');
      return;
    }

    try {
      const { error } = await supabase.from('case_assignments').update(updatePayload).eq('id', assignmentId);
      if (error) throw error;
      await supabase.from('case_history').insert(historyPayload);
      await unlockCase(familyId);
      fetchAssignments(selectedCamp.id);
      toast('✅ تم التزامن بنجاح', 'success');
    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء التحديث', 'error');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'غير محدد';
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
  };

  const handleBatchReserve = async () => {
    if (!profile || isOffline || !selectedCamp) return;
    try {
       const { data, error } = await supabase.rpc('reserve_case_batch', {
          p_volunteer_id: profile.id,
          p_campaign_id: selectedCamp.id,
          p_limit: 10
       });
       if (error) throw error;
       toast(`📦 تم حجز ${data?.length || 0} حالات جديدة لك بنجاح`, 'success');
       fetchAssignments(selectedCamp.id);
    } catch (err) {
      toast('❌ فشل حجز الدفعة، تأكد من توفر حالات شاغرة', 'error');
    }
  };

  const assignmentsToDisplay = isOffline ? myAssignments : globalAssignments;

  const filtered = assignmentsToDisplay.filter((a) => {
    const matchTab = tab === 'all' ? true : tab === 'pending' ? ['pending', 'in_progress'].includes(a.status) : a.status === tab;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || (
      a.family?.mother_name?.toLowerCase().includes(q)  ||
      a.family?.phone?.includes(q)                       ||
      a.family?.sequential_id?.toLowerCase().includes(q) ||
      a.family?.governorate?.includes(q)
    );
    return matchTab && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.volunteer_id === profile?.id && b.volunteer_id !== profile?.id) return -1;
    if (a.volunteer_id !== profile?.id && b.volunteer_id === profile?.id) return 1;
    return (b.family?.priority_score ?? 0) - (a.family?.priority_score ?? 0);
  });

  const completedCount = assignmentsToDisplay.filter(a => a.status === 'completed').length;

  if (view === 'selection') {
    return (
      <div className="screen active p-md">
        <header className="page-header" style={{ marginBottom: '2rem' }}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="page-title">مرحباً، {profile?.full_name?.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">اختر الحملة التي تود العمل عليها اليوم</p>
          </motion.div>
          <button className="btn-ghost" onClick={fetchCampaigns} style={{ padding: '10px' }}>
            <RefreshCw size={20} className={loading && allCampaigns.length === 0 ? 'animate-spin' : ''} />
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {allCampaigns.length === 0 && !loading ? (
              <div key="empty" className="empty-state col-span-full">
                <div className="empty-state-icon">🌵</div>
                <p>لا توجد حملات نشطة حالياً</p>
              </div>
            ) : (
              allCampaigns.map((camp, idx) => {
                const Config = TYPE_CONFIG[camp.campaign_type] || TYPE_CONFIG.other;
                return (
                  <motion.div
                    key={camp.id}
                    className="campaign-card-premium clickable"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setSelectedCamp(camp);
                      setView('tasks');
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div className="campaign-type-icon" style={{ background: Config.bg, color: Config.color, marginBottom: 0 }}>
                        <Config.icon size={24} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <Calendar size={12} />
                        {formatDate(camp.start_date)} - {formatDate(camp.end_date)}
                      </div>
                    </div>
                    <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>{camp.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1rem', flex: 1 }}>
                      {camp.description || 'حملة نشطة تهدف لخدمة الأسر المستحقة.'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>ابدأ العمل الآن ←</span>
                      <div className="badge badge-in-progress" style={{ fontSize: '0.65rem' }}>نشط</div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="screen active" style={{ display: 'block' }}>
      <section className="section">
        <motion.div className="campaign-banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="banner-icon-row">
            <button 
              className="btn-ghost" 
              style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 800 }}
              onClick={() => {
                setView('selection');
                setSelectedCamp(null);
              }}
            >
              <ArrowLeft size={18} />
              كل الحملات
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!isOffline && (
                <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '12px' }} onClick={handleBatchReserve}>
                  📦 حجز 10 حالات
                </button>
              )}
              <button className="btn-ghost" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => fetchAssignments(selectedCamp!.id)} disabled={isOffline}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          <div className="banner-title">{selectedCamp?.name}</div>
          <div className="banner-date">بمشاركة المتطوعة: {profile?.full_name}</div>
          <div className="progress-wrap mt-md">
            <div className="progress-labels">
              <span>{isOffline ? 'المهام المحفوظة بجهازك' : 'نسبة الإنجاز بالحملة'}</span>
              <span>{assignmentsToDisplay.length ? Math.round((completedCount / assignmentsToDisplay.length) * 100) : 0}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${assignmentsToDisplay.length ? (completedCount / assignmentsToDisplay.length) * 100 : 0}%` }}></div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="section">
        <div className="search-box mb-sm">
          <span className="search-box-icon">🔍</span>
          <input type="search" placeholder="ابحث بالاسم، الهاتف..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--white)' }} />
        </div>
        <div className="filter-bar mb-md">
          {TABS.map(t => {
            const count = t.key === 'all' ? assignmentsToDisplay.length : assignmentsToDisplay.filter(a => (t.key === 'pending' ? ['pending', 'in_progress'].includes(a.status) : a.status === t.key)).length;
            return (
              <button key={t.key} className={`filter-chip ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label} 
                {count > 0 && <span style={{ marginRight: '0.3rem', opacity: 0.8 }}>({count})</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>{[1, 2, 3].map(i => <div key={i} style={{ height: 160, background: '#e2e8f0', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />)}</div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--gray-600)' }}>
            <CheckCircle size={48} style={{ margin: '0 auto', color: 'var(--green-light)', marginBottom: '1rem' }} />
            <p className="fw-700">لا توجد مهام حالياً</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence mode="popLayout">
              {sorted.map((asgn, i) => <FamilyCard key={asgn.id} assignment={asgn} lock={locks.get(asgn.family_id) ?? null} currentUserId={profile?.id} onAction={handleAction} showQuickActions={asgn.status !== 'completed'} index={i} />)}
            </AnimatePresence>
          </div>
        )}
      </section>

      {selectedAsgn && <FamilyDetail isOpen={!!selectedAsgn} assignment={selectedAsgn} currentUserId={profile?.id} onClose={async () => { if (!isOffline) await unlockCase(selectedAsgn.family_id); setSelectedAsgn(null); }} onAction={(action) => handleAction(action, selectedAsgn.id)} />}
    </div>
  );
}
