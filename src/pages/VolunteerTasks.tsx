import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  MapPin, Phone, Calendar, CheckCircle, 
  Clock, ExternalLink, RefreshCw, X 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '../components/Toast';
import { calculateDistribution } from '../lib/distributionService';
import { lockService } from '../lib/lockService';
import type { Child, Campaign } from '../types';

interface Assignment {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'no_answer' | 'unreachable';
  assigned_at: string;
  family: {
    id: string;
    mother_name: string;
    phone: string;
    address: string;
    district: string;
    priority_score: number;
    children: Child[];
  };
  campaign: Campaign;
}

export default function VolunteerTasks() {
  const { profile } = useAuthStore();
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [locks, setLocks] = useState<any[]>([]);
  const [wallet, setWallet] = useState({ received: 0, distributed: 0 });

  useEffect(() => {
    if (profile?.id) {
      fetchTasks();
      fetchWallet();
      const interval = setInterval(() => {
        fetchLocks();
      }, 30000); // Pulse every 30s
      return () => clearInterval(interval);
    }
  }, [profile?.id]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_assignments')
        .select(`
          id,
          status,
          assigned_at,
          family:families (
            id,
            mother_name,
            phone,
            address,
            district,
            priority_score,
            children (
              id,
              child_name,
              age,
              gender,
              school_stage,
              is_orphan,
              national_id
            )
          ),
          campaign:campaigns (*)
        `)
        .eq('volunteer_id', profile?.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setTasks(data as any[] || []);
      
      // Also fetch locks for all campaigns found
      if (data && (data as any[]).length > 0) {
        const campaignIds = [...new Set((data as any[]).map((t: any) => t.campaign.id))];
        const allLocks = await Promise.all(campaignIds.map(id => lockService.getActiveLocks(id as string)));
        setLocks(allLocks.flat());
      }
    } catch (err: any) {
      console.error(err);
      toast('حدث خطأ في جلب المهام', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchLocks() {
    if (tasks.length > 0) {
      const activeLocks = await lockService.getActiveLocks(tasks[0].campaign.id);
      setLocks(activeLocks);
    }
  }

  async function fetchWallet() {
    if (!profile?.id) return;
    try {
      const { data: transfers } = await supabase
        .from('volunteer_fund_transfers')
        .select('amount')
        .eq('receiver_id', profile.id);
      
      const { data: txs } = await supabase
        .from('transactions')
        .select('total_amount, amount')
        .eq('volunteer_id', profile.id);

      const received = (transfers || []).reduce((acc, t) => acc + t.amount, 0);
      const distributed = (txs || []).reduce((acc, t) => acc + (t.total_amount || t.amount || 0), 0);
      
      setWallet({ received, distributed });
    } catch (err) {
      console.error('Wallet fetch error', err);
    }
  }

  const handleStartWork = async (familyId: string, campaignId: string) => {
    if (!profile?.id) return;
    const res = await lockService.acquireLock(familyId, campaignId, profile.id);
    if (!res.success) {
      toast('⚠️ هذه الحالة قيد المعالجة حالياً من قبل متطوع آخر', 'warning');
      fetchLocks();
      return false;
    }
    toast('💪 تم قفل الحالة لك، يمكنك البدء بالتنفيذ', 'success');
    const task = tasks.find(t => t.family.id === familyId);
    if (task) updateStatus(task.id, 'in_progress', familyId, campaignId);
    fetchLocks();
    return true;
  };

  const updateStatus = async (taskId: string, newStatus: string, familyId?: string, campaignId?: string) => {
    try {
      const { error } = await supabase
        .from('case_assignments')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      
      // Log to case_history
      if (familyId && profile?.id) {
        let actionType = 'STATUS_CHANGED';
        if (newStatus === 'completed') actionType = 'TRANSFER_DONE';
        if (newStatus === 'no_answer') actionType = 'CALLED_NO_ANSWER';
        if (newStatus === 'unreachable') actionType = 'UNREACHABLE';

        await supabase.from('case_history').insert({
          family_id: familyId,
          campaign_id: campaignId,
          user_id: profile.id,
          user_name: profile.full_name,
          action_type: actionType,
          description: `تغيير الحالة إلى ${newStatus}`,
          metadata: { status: newStatus }
        });
      }

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
      toast('✅ تم تحديث الحالة وتوثيقها', 'success');
    } catch (err: any) {
      toast('❌ فشل تحديث الحالة', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':   return <span className="badge badge-completed">مكتملة</span>;
      case 'in_progress': return <span className="badge badge-in-progress">قيد التنفيذ</span>;
      case 'pending':     return <span className="badge badge-pending">معلقة</span>;
      default:            return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">سجل العمليات</h1>
          <p className="page-subtitle">إدارة الحالات الموكلة إليك حالياً للمتابعة والتوزيع</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="card p-sm px-md" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: '14px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary-dark)', opacity: 0.7 }}>رصيد محفظتي</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--primary)' }}>{(wallet.received - wallet.distributed).toLocaleString('ar-EG')} ج.م</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchTasks} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 20 }} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '3rem' }}>
          <div className="empty-state-icon">✅</div>
          <h2>لا توجد مهام حالياً</h2>
          <p>أنت الآن غير مكلف بأي حالات. شكراً لجهودك!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
          {tasks.map((task) => (
            <motion.div 
              key={task.id} 
              className="case-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="case-card-header">
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{task.family.mother_name}</h3>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    {getStatusBadge(task.status)}
                    <span className="priority-badge" style={{ 
                      background: task.family.priority_score > 7 ? '#fef2f2' : '#f0fdf4',
                      color: task.family.priority_score > 7 ? '#ef4444' : '#16a34a'
                    }}>
                      أولوية {task.family.priority_score}
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                      {task.campaign.name}
                    </span>
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'left' }}>
                  {locks.find(l => l.family_id === task.family.id && l.locked_by !== profile?.id) && (
                    <div style={{ color: 'var(--error)', fontWeight: 800, marginBottom: '0.2rem' }}>
                      🚫 قيد المعالجة (بواسطة {locks.find(l => l.family_id === task.family.id)?.locked_by_name || 'متطوع آخر'})
                    </div>
                  )}
                  <Calendar size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  {new Date(task.assigned_at).toLocaleDateString('ar-EG')}
                </div>
              </div>

              <div className="case-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <MapPin size={16} color="var(--primary)" />
                    <span className="truncate-2">{task.family.district} — {task.family.address}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Phone size={16} color="var(--primary)" />
                    <a href={`tel:${task.family.phone}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>{task.family.phone}</a>
                  </div>
                </div>

                {/* Financial Breakdown Section */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <RefreshCw size={14} /> تفاصيل المبلغ المستحق
                  </h4>
                  
                  {(() => {
                    const breakdown = calculateDistribution(task.family as any, task.campaign);
                    return (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {breakdown.childrenBreakdown.map((s: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span>{s.name} ({s.age} سنة)</span>
                              <span style={{ fontWeight: 600 }}>{s.amount} ج.م</span>
                            </div>
                          ))}
                          <div style={{ height: '1px', background: 'var(--border-light)', margin: '0.4rem 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span>رسوم التحويل</span>
                            <span>{breakdown.fee} ج.م</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 800, marginTop: '0.4rem' }}>
                            <span>الإجمالي</span>
                            <span>{breakdown.total} ج.م</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="case-card-footer">
                {task.status !== 'completed' ? (
                  <>
                    {task.status === 'pending' ? (
                      <button 
                        className="btn btn-primary btn-sm flex-1"
                        onClick={() => handleStartWork(task.family.id, task.campaign.id)}
                      >
                        <Clock size={16} /> ابدأ التنفيذ الآن
                      </button>
                    ) : (
                      <>
                        <button 
                          className="btn btn-primary btn-sm flex-1"
                          onClick={() => updateStatus(task.id, 'completed', task.family.id, task.campaign.id).then(() => lockService.releaseLock(task.family.id, profile?.id || ''))}
                        >
                          <CheckCircle size={16} /> إتمام التوزيع
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (window.confirm('تعذر التواصل؟')) {
                               updateStatus(task.id, 'no_answer', task.family.id, task.campaign.id);
                            }
                          }}
                        >
                          لم يرد
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (window.confirm('هل تريد إلغاء القفل والعودة لاحقاً؟')) {
                              lockService.releaseLock(task.family.id, profile?.id || '');
                              updateStatus(task.id, 'pending', task.family.id, task.campaign.id);
                            }
                          }}
                        >
                          <X size={16} /> إلغاء
                        </button>
                      </>
                    )}
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={() => window.open(`https://maps.google.com/?q=${task.family.address}`, '_blank')}
                    >
                      <ExternalLink size={16} /> خرائط
                    </button>
                  </>
                ) : (
                  <div style={{ width: '100%', textAlign: 'center', padding: '0.5rem', color: 'var(--green-light)', fontWeight: 700 }}>
                    ✨ تمت هذه المهمة بنجاح
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
