import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  MapPin, Phone, CheckCircle, 
  Clock, RefreshCw, X 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '../lib/toast';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const currentTask = tasks.find(t => t.id === taskId);
        let actionType = 'STATUS_CHANGED';
        if (newStatus === 'completed') actionType = 'TRANSFER_DONE';
        if (newStatus === 'no_answer') actionType = 'CALLED_NO_ANSWER';
        if (newStatus === 'unreachable') actionType = 'UNREACHABLE';
        if (newStatus === 'in_progress' && currentTask?.status === 'completed') actionType = 'UNDO_COMPLETED';

        await supabase.from('case_history').insert({
          family_id: familyId,
          campaign_id: campaignId,
          user_id: profile.id,
          user_name: profile.full_name,
          action_type: actionType,
          description: actionType === 'UNDO_COMPLETED' ? 'تراجع عن الإتمام' : `تغيير الحالة إلى ${newStatus}`
        });
      }

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
      toast('✅ تم تحديث الحالة وتوثيقها', 'success');
    } catch {
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
    <div className="page-content" style={{ paddingBottom: '5rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 900 }}>سجل العمليات</h1>
          <p className="page-subtitle">إدارة الحالات الموكلة إليك حالياً للمتابعة والتوزيع</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchTasks} disabled={loading} style={{ borderRadius: '12px', background: 'var(--surface)' }}>
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fff 0%, #f0fdf4 100%)', border: '1px solid #dcfce7' }}>
          <div className="stat-label">رصيد المحفظة</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{(wallet.received - wallet.distributed).toLocaleString('ar-EG')} <span style={{ fontSize: '0.8rem' }}>ج.م</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">إجمالي المهام</div>
          <div className="stat-value">{tasks.length}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fff 0%, #eff6ff 100%)', border: '1px solid #dbeafe' }}>
          <div className="stat-label">قيد التنفيذ</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>{tasks.filter(t => t.status === 'in_progress').length}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fff 0%, #fff7ed 100%)', border: '1px solid #ffedd5' }}>
          <div className="stat-label">معلقة</div>
          <div className="stat-value" style={{ color: '#ea580c' }}>{tasks.filter(t => t.status === 'pending').length}</div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 24 }} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className=" glass-card" style={{ marginTop: '2rem', padding: '5rem 2rem', textAlign: 'center', background: 'white', borderRadius: '32px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✨</div>
          <h2 style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--primary-dark)' }}>لا توجد مهام حالياً</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '1rem auto' }}>
            أنت الآن غير مكلف بأي حالات توزيع أو متابعة. يمكنك مراجعة الإدارة للأعمال القادمة.
          </p>
          <button className="btn btn-primary" onClick={fetchTasks} style={{ marginTop: '1.5rem', padding: '0.75rem 2rem' }}>
            <RefreshCw size={18} style={{ marginLeft: '8px' }} /> تحديث الصفحة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
          {tasks.map((task) => (
            <motion.div 
              key={task.id} 
              className="card"
              style={{ 
                background: 'white', 
                borderRadius: '24px', 
                border: task.status === 'in_progress' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden'
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                    {task.campaign.name}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{task.family.mother_name}</h3>
                  {locks.find(l => l.family_id === task.family.id && l.locked_by !== profile?.id) && (
                    <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 800, marginTop: '0.25rem' }}>
                      🚫 قيد المعالجة بواسطة متطوع آخر
                    </div>
                  )}
                </div>
                {getStatusBadge(task.status)}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} color="var(--primary)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{task.family.district}</span>
                </div>
                <div style={{ flex: 1, background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} color="var(--primary)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {new Date(task.assigned_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '16px', marginBottom: '1.25rem', border: '1px dashed #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>تفاصيل المستحقات:</div>
                {(() => {
                  const breakdown = calculateDistribution(task.family as any, task.campaign);
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)' }}>
                        {breakdown.total.toLocaleString('ar-EG')} <span style={{ fontSize: '0.7rem' }}>ج.م</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                        {breakdown.childrenBreakdown.length} أبناء + رسوم
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {task.status !== 'completed' ? (
                  <>
                    {task.status === 'pending' ? (
                      <button 
                        className="btn btn-primary btn-sm flex-1"
                        style={{ height: '42px', borderRadius: '12px' }}
                        onClick={() => handleStartWork(task.family.id, task.campaign.id)}
                      >
                        ابدأ التنفيذ
                      </button>
                    ) : (
                      <>
                        <button 
                          className="btn btn-primary btn-sm flex-1"
                          style={{ height: '42px', borderRadius: '12px' }}
                          onClick={() => updateStatus(task.id, 'completed', task.family.id, task.campaign.id).then(() => lockService.releaseLock(task.family.id, profile?.id || ''))}
                        >
                          <CheckCircle size={16} /> إتمام
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm"
                          style={{ height: '42px', borderRadius: '12px', background: '#fff7ed', color: '#ea580c' }}
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
                          style={{ height: '42px', width: '42px', padding: 0, borderRadius: '12px', background: '#f8fafc' }}
                          onClick={() => {
                            if (window.confirm('إلغاء القفل؟')) {
                              lockService.releaseLock(task.family.id, profile?.id || '');
                              updateStatus(task.id, 'pending', task.family.id, task.campaign.id);
                            }
                          }}
                          title="إلغاء"
                        >
                          <X size={18} />
                        </button>
                      </>
                    )}
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ height: '42px', width: '42px', padding: 0, borderRadius: '12px' }}
                      onClick={() => window.open(`tel:${task.family.phone}`, '_self')}
                    >
                      <Phone size={18} />
                    </button>
                  </>
                ) : (
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem' }}>
                      ✨ المهمة مكتملة
                    </div>
                    <button 
                      className="btn btn-ghost btn-sm"
                      style={{ height: '42px', padding: '0 1rem', borderRadius: '12px', background: '#fef2f2', color: '#dc2626' }}
                      onClick={() => {
                        if (window.confirm('هل تريد التراجع عن إتمام هذه المهمة؟')) {
                          updateStatus(task.id, 'in_progress', task.family.id, task.campaign.id);
                        }
                      }}
                    >
                      تراجع
                    </button>
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
