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
  financial:       { label: 'تحويل مالي',  icon: Coins,       color: '#059664', bg: 'rgba(5, 150, 100, 0.1)' },
  food_basket:     { label: 'كرتونة طعام', icon: ShoppingBag, color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  clothing:        { label: 'كسوة / ملابس', icon: Heart,       color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
  school_supplies: { label: 'أدوات مدرسية', icon: Target,      color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  other:           { label: 'عام / أخرى',  icon: Info,        color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
};

export default function VolunteerHome() {
  const { profile } = useAuthStore();
  const { addToSyncQueue, myAssignments, setMyAssignments } = useOfflineStore();
  
  const [view, setView] = useState<ViewState>('selection');
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [selectedCamp, setSelectedCamp] = useState<Campaign | null>(null);
  const [globalAssignments, setGlobalAssignments] = useState<CaseAssignment[]>([]);
  const [locks, setLocks] = useState<Map<string, CaseLock>>(new Map());
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('pending');
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
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
      const { data: camps, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch progress stats for all campaigns in parallel
      if (camps && camps.length > 0) {
        const ids = camps.map((c: any) => c.id);
        const { data: stats } = await supabase
          .from('case_assignments')
          .select('campaign_id, status')
          .in('campaign_id', ids);

        const statsMap: Record<string, { total: number; completed: number }> = {};
        (stats || []).forEach((s: any) => {
          if (s.status === 'skipped') return; // Ignore excluded cases
          if (!statsMap[s.campaign_id]) statsMap[s.campaign_id] = { total: 0, completed: 0 };
          statsMap[s.campaign_id].total++;
          if (s.status === 'completed') statsMap[s.campaign_id].completed++;
        });

        setAllCampaigns(camps.map((c: any) => ({ ...c, _stats: statsMap[c.id] || { total: 0, completed: 0 } })));
      } else {
        setAllCampaigns(camps || []);
      }
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
            status, notes,
            children:children (id, is_orphan, school_stage, child_name, age)
          ),
          volunteer:profiles(full_name),
          campaign:campaigns(*)
        `)
        .eq('campaign_id', campaignId)
        .neq('status', 'skipped')
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
        const targetFamily = globalAssignments.find(a => a.id === assignmentId)?.family_id;
        const { error } = await supabase.rpc('reserve_single_case', {
           p_volunteer_id: profile.id,
           p_family_id: targetFamily,
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

    // For no_answer/unreachable: release case back to pool for other volunteers
    if (action === 'no_answer' || action === 'unreachable') {
      const releasePayload = {
        family_id: familyId,
        user_id:   profile.id,
        user_name: profile.full_name,
        action_type: action === 'no_answer' ? 'CALLED_NO_ANSWER' : 'UNREACHABLE',
        description: action === 'no_answer' ? 'جرس ولم يرد — تم تحرير الحالة للمسبح' : 'الرقم مغلق / تعذر التواصل',
        campaign_id: asgn.campaign_id,
      };

      if (isOffline) {
        addToSyncQueue({ type: 'UPDATE_STATUS', payload: { id: assignmentId, status: newStatus, volunteer_id: null } });
        addToSyncQueue({ type: 'LOG_TRANSFER', payload: releasePayload });
        const updater = (prev: CaseAssignment[]) => prev.map(a => a.id === assignmentId ? { ...a, status: newStatus as AssignmentStatus, volunteer_id: undefined } : a);
        setGlobalAssignments(updater);
        setMyAssignments(updater(myAssignments));
        toast('💾 تم الحفظ محلياً — سيتم الإفراج عن الحالة فور توفر نت', 'info');
        setSelectedAsgn(null);
        return;
      }

      try {
        await supabase.from('case_assignments')
          .update({ status: newStatus, volunteer_id: null, assigned_at: null })
          .eq('id', assignmentId);
        await supabase.from('case_history').insert(releasePayload);
        await unlockCase(familyId);
        fetchAssignments(selectedCamp.id);
        setSelectedAsgn(null);
        toast('🔓 تم تحرير الحالة. يمكن لمتطوع آخر محاولة التواصل لاحقاً.', 'info');
      } catch (err) {
        toast('حدث خطأ أثناء تحرير الحالة', 'error');
      }
      return;
    }

    // For completed: mark done and close
    const completedPayload = {
      id: assignmentId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };
    const historyPayload = {
      family_id: familyId,
      user_id: profile.id,
      user_name: profile.full_name,
      action_type: 'TRANSFER_DONE',
      description: 'تم التحويل بنجاح وإتمام المهمة',
      campaign_id: asgn.campaign_id,
    };

    if (isOffline) {
      addToSyncQueue({ type: 'UPDATE_STATUS', payload: completedPayload });
      addToSyncQueue({ type: 'LOG_TRANSFER', payload: historyPayload });
      const updater = (prev: CaseAssignment[]) => prev.map(a => a.id === assignmentId ? { ...a, status: 'completed' as AssignmentStatus } : a);
      setGlobalAssignments(updater);
      setMyAssignments(updater(myAssignments));
      toast('💾 تم الحفظ محلياً - سيتم الرفع فور توفر نت', 'info');
      setSelectedAsgn(null);
      return;
    }

    try {
      const { error } = await supabase.from('case_assignments').update(completedPayload).eq('id', assignmentId);
      if (error) throw error;
      await supabase.from('case_history').insert(historyPayload);
      await unlockCase(familyId);
      fetchAssignments(selectedCamp.id);
      setSelectedAsgn(null);
      toast('✅ تم تسجيل التحويل بنجاح 🎉', 'success');
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
       toast(`📦 تم حجز ${(data as any)?.reserved || 0} حالات جديدة لك بنجاح`, 'success');
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
      (a.family as any)?.sequential_id?.toLowerCase().includes(q) ||
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

  // ── CAMPAIGN SELECTION VIEW ──
  if (view === 'selection') {
    return (
      <div className="page-content">
        {/* Greeting Hero */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
            borderRadius: '20px', padding: '1.25rem 1.5rem',
            color: 'white', marginBottom: '1.25rem',
            boxShadow: '0 8px 24px rgba(6,147,100,0.25)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.78rem', opacity: 0.8, marginBottom: '2px' }}>أهلاً بك 🌟</p>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1.2 }}>
                {profile?.full_name?.split(' ').slice(0, 2).join(' ')}
              </h1>
              <p style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px' }}>اختر الحملة التي تود العمل عليها</p>
            </div>
            <button
              onClick={fetchCampaigns}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '10px', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
            >
              <RefreshCw size={15} className={loading && allCampaigns.length === 0 ? 'animate-spin' : ''} />
            </button>
          </div>
        </motion.div>

        {/* Campaign Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <AnimatePresence mode="popLayout">
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
              ))
            ) : allCampaigns.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{
                  textAlign: 'center', padding: '3rem 1rem',
                  background: '#fdfbeb', borderRadius: '16px', border: '2px dashed #f0d080'
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌵</div>
                <p style={{ fontWeight: 700, color: 'var(--text-muted)' }}>لا توجد حملات نشطة حالياً</p>
              </motion.div>
            ) : (
              allCampaigns.map((camp: any, idx: number) => {
                const Config = TYPE_CONFIG[camp.campaign_type as CampaignType] || TYPE_CONFIG.other;
                const stats = camp._stats as { total: number; completed: number } | undefined;
                const progress = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                return (
                  <motion.div
                    key={camp.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedCamp(camp); setView('tasks'); }}
                    style={{
                      background: 'white', borderRadius: '16px',
                      border: '1px solid var(--border)',
                      borderRight: `4px solid ${Config.color}`,
                      padding: '1rem', cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: stats && stats.total > 0 ? '0.75rem' : 0 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '14px', flexShrink: 0,
                        background: Config.bg, color: Config.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Config.icon size={24} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
                          {camp.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Calendar size={11} /> {formatDate(camp.start_date)}
                            {camp.end_date && <> — {formatDate(camp.end_date)}</>}
                          </span>
                          {stats && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: Config.color }}>
                              {stats.completed}/{stats.total} حالة
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ color: Config.color, opacity: 0.7, flexShrink: 0 }}>←</div>
                    </div>

                    {/* Progress Bar */}
                    {stats && stats.total > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          <span>{progress === 100 ? '✅ مكتملة' : '⚡ جارٍ العمل...'}</span>
                          <span>{progress}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: `${Config.color}22`, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: Config.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── TASKS VIEW ──
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
