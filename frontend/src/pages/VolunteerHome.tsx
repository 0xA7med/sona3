import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/Toast';
import FamilyCard from '../components/FamilyCard';
import type { CaseAssignment, CaseLock, AssignmentStatus } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type FilterTab = 'all' | 'pending' | 'no_answer' | 'completed';

const TABS: { key: FilterTab; label: string; emoji: string }[] = [
  { key: 'all',       label: 'الكل',           emoji: '📋' },
  { key: 'pending',   label: 'لم تُنجز',        emoji: '⏳' },
  { key: 'no_answer', label: 'لم يردوا',        emoji: '📞' },
  { key: 'completed', label: 'مكتملة',          emoji: '✅' },
];

export default function VolunteerHome() {
  const { profile } = useAuthStore();
  const [assignments, setAssignments] = useState<CaseAssignment[]>([]);
  const [locks,       setLocks]       = useState<Map<string, CaseLock>>(new Map());
  const [search,      setSearch]      = useState('');
  const [tab,         setTab]         = useState<FilterTab>('pending');
  const [loading,     setLoading]     = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const myLocksRef = useRef<Set<string>>(new Set());

  /* ── Fetch assignments ─────────────────────────────────── */
  const fetchAssignments = useCallback(async () => {
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
            children:children (id, is_orphan, school_stage)
          )
        `)
        .eq('volunteer_id', profile.id)
        .neq('status', 'skipped')
        .order('status', { ascending: true });

      if (error) throw error;

      const enriched = (data ?? []).map((a) => ({
        ...a,
        family: a.family
          ? { ...a.family, _children_count: (a.family as any).children?.length ?? 0 }
          : undefined,
      }));

      setAssignments(enriched as CaseAssignment[]);
    } catch (err) {
      console.error(err);
      toast('حدث خطأ في تحميل المهام', 'error');
    } finally {
      setLoading(false);
    }
  }, [profile]);

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
      myLocksRef.current.forEach(async (familyId) => {
        await supabase.from('case_locks').delete().eq('family_id', familyId);
      });
    };
  }, []);

  /* ── Lock / unlock helpers ─────────────────────────────── */
  const lockCase = async (familyId: string) => {
    if (!profile) return;
    await supabase.from('case_locks').upsert({
      family_id: familyId,
      locked_by: profile.id,
      locked_by_name: profile.full_name,
      locked_at: new Date().toISOString(),
    });
    myLocksRef.current.add(familyId);
  };

  const unlockCase = async (familyId: string) => {
    await supabase.from('case_locks').delete().eq('family_id', familyId);
    myLocksRef.current.delete(familyId);
  };

  /* ── Quick Action handler ──────────────────────────────── */
  const handleAction = async (
    action: 'no_answer' | 'unreachable' | 'completed' | 'view',
    assignmentId: string
  ) => {
    const asgn = assignments.find(a => a.id === assignmentId);
    if (!asgn || !asgn.family) return;

    const familyId = asgn.family_id;

    if (action === 'view') {
      await lockCase(familyId);
      // TODO: open family detail modal/page
      toast('جارٍ فتح ملف الأسرة...', 'info');
      return;
    }

    const statusMap: Record<string, AssignmentStatus> = {
      no_answer:   'no_answer',
      unreachable: 'unreachable',
      completed:   'completed',
    };

    const newStatus = statusMap[action];
    if (!newStatus) return;

    try {
      const { error } = await supabase
        .from('case_assignments')
        .update({
          status: newStatus,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', assignmentId);

      if (error) throw error;

      // Log to case_history
      await supabase.from('case_history').insert({
        family_id: familyId,
        user_id:   profile?.id,
        user_name: profile?.full_name,
        action_type: action === 'no_answer' ? 'CALLED_NO_ANSWER'
                   : action === 'unreachable' ? 'UNREACHABLE'
                   : 'CONTACTED',
        description: action === 'no_answer'   ? 'جرس ولم يرد'
                   : action === 'unreachable'  ? 'الرقم مغلق / تعذر التواصل'
                   : 'تم التواصل بنجاح وإتمام المهمة',
        campaign_id: asgn.campaign_id,
      });

      await unlockCase(familyId);

      setAssignments(prev =>
        prev.map(a => a.id === assignmentId ? { ...a, status: newStatus as AssignmentStatus } : a)
      );

      const messages = {
        no_answer:   '📞 تم تسجيل "لم يرد"',
        unreachable: '🚫 تم تسجيل "مغلق"',
        completed:   '✅ أحسنت! تم إنجاز المهمة',
      };
      toast(messages[action as keyof typeof messages], action === 'completed' ? 'success' : 'warning');

    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء التحديث، حاول مجدداً', 'error');
    }
  };

  /* ── Filter logic ──────────────────────────────────────── */
  const filtered = assignments.filter((a) => {
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

  // Sort by priority descending
  const sorted = [...filtered].sort((a, b) =>
    (b.family?.priority_score ?? 0) - (a.family?.priority_score ?? 0)
  );

  const completedCount = assignments.filter(a => a.status === 'completed').length;
  const pendingCount   = assignments.filter(a => ['pending', 'in_progress'].includes(a.status)).length;

  return (
    <div className="page-content">
      {/* Header */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <div>
          <h1 className="page-title">مهامي اليوم</h1>
          <p className="page-subtitle">
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{pendingCount}</span> مهمة معلقة
            {completedCount > 0 && <> · <span style={{ color: '#10b981', fontWeight: 700 }}>{completedCount}</span> مكتملة</>}
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchAssignments}
          title="تحديث"
        >
          <RefreshCw size={16} />
        </button>
      </motion.div>

      {/* Progress bar */}
      {assignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginBottom: '1.25rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
            <span>التقدم</span>
            <span>{completedCount} / {assignments.length}</span>
          </div>
          <div style={{ height: 8, background: '#d4ebe3', borderRadius: '999px', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--gold))', borderRadius: '999px' }}
              animate={{ width: `${assignments.length ? (completedCount / assignments.length) * 100 : 0}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 20 }}
            />
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="search-box form-group">
        <Search size={16} className="search-icon" />
        <input
          type="search"
          className="form-input"
          placeholder="ابحث بالاسم أو الهاتف أو المنطقة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingRight: '2.75rem' }}
        />
      </div>

      {/* Tabs */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        {TABS.map(t => {
          const count = t.key === 'all' ? assignments.length
            : t.key === 'pending' ? pendingCount
            : assignments.filter(a => a.status === t.key).length;
          return (
            <button
              key={t.key}
              className={`filter-chip ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.emoji} {t.label}
              {count > 0 && (
                <span style={{
                  marginRight: '0.25rem',
                  background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'var(--primary-light)',
                  color: tab === t.key ? 'white' : 'var(--primary)',
                  padding: '0.05rem 0.4rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cases */}
      {loading ? (
        <div className="cases-grid">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />)}
        </div>
      ) : sorted.length === 0 ? (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="empty-state-icon">
            <CheckCircle size={28} />
          </div>
          <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {tab === 'completed' ? '🎉 لم تُكمل أي مهمة بعد' : 'لا توجد مهام في هذا القسم'}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>
            {search ? 'جرب بحثاً مختلفاً' : 'ستظهر هنا المهام المُسندة إليك'}
          </p>
        </motion.div>
      ) : (
        <div className="cases-grid">
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
    </div>
  );
}
