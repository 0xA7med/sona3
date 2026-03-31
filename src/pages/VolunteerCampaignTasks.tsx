import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  ArrowRight, Phone, CheckCircle, 
  ChevronDown, ChevronUp, DollarSign, Download, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../components/Toast';
import { calculateDistribution } from '../lib/distributionService';
import type { Campaign, Family } from '../types';

interface AssignmentRow {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'no_answer' | 'unreachable';
  volunteer_id: string | null;
  family: Family;
}

export default function VolunteerCampaignTasks() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [myTasks, setMyTasks] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stats
  const [poolCount, setPoolCount] = useState(0);
  const [allStats, setAllStats] = useState({ total: 0, completed: 0 });

  useEffect(() => {
    if (id && profile?.id) {
      fetchData();
      
      // Setup realtime listener for pool updates
      const channel = supabase.channel('pool_updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'case_assignments', filter: `campaign_id=eq.${id}` },
          () => fetchPoolStats()
        )
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [id, profile?.id]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch Campaign
      const { data: cData, error: cErr } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      if (cErr) throw cErr;
      setCampaign(cData as Campaign);

      // 2. Fetch My Tasks
      const { data: tData, error: tErr } = await supabase
        .from('case_assignments')
        .select(`
          id, status, volunteer_id,
          family:families (
            id, mother_name, phone, address, district, priority_score, status, sequential_id,
            children ( id, child_name, age, gender, school_stage, is_orphan, national_id, date_of_birth, birth_date )
          )
        `)
        .eq('campaign_id', id)
        .eq('volunteer_id', profile?.id)
        .in('status', ['pending', 'in_progress'])
        .order('assigned_at', { ascending: false });
        
      if (tErr) throw tErr;
      setMyTasks(tData as unknown as AssignmentRow[] || []);

      // 3. Fetch Generic Stats
      await fetchPoolStats();

    } catch (err: any) {
      console.error(err);
      toast('تعذر تحميل بيانات الحملة', 'error');
      navigate('/volunteer');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPoolStats() {
    // Count exact pool (pending && volunteer_id IS NULL)
    const { count: pool } = await supabase
      .from('case_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .is('volunteer_id', null)
      .eq('status', 'pending');

    setPoolCount(pool || 0);

    // Count overall completion
    const { count: comp } = await supabase
      .from('case_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('status', 'completed');
      
    const { count: totalTasks } = await supabase
      .from('case_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id);

    setAllStats({ total: totalTasks || 0, completed: comp || 0 });
  }

  const handleReserve = async () => {
    if (!profile?.id || !id) return;
    setOperating(true);
    try {
      const { data, error } = await supabase.rpc('reserve_cases', {
        p_campaign_id: id,
        p_volunteer_id: profile.id,
        p_limit: 10
      });

      if (error) throw error;
      
      const count = data?.length || 0;
      if (count > 0) {
        toast(`تم حجز ${count} حالات بنجاح!`, 'success');
        fetchData();
      } else {
        toast('لا توجد حالات متاحة حالياً', 'warning');
      }
    } catch (err: any) {
      console.error(err);
      toast('فشل حجز الحالات، تأكد من اتصالك', 'error');
    } finally {
      setOperating(false);
    }
  };

  const handleRelease = async () => {
    if (!myTasks.length) return;
    if (!window.confirm('هل أنت متأكد من إرجاع جميع الحالات المعلقة ليعمل عليها غيرك؟')) return;
    
    setOperating(true);
    try {
      const { data, error } = await supabase.rpc('release_cases', {
        p_campaign_id: id,
        p_volunteer_id: profile?.id
      });
      if (error) throw error;
      
      toast(`تم إرجاع ${data} حالات للمسبح بنجاح`, 'success');
      setMyTasks([]);
      fetchPoolStats();
      setExpandedId(null);
    } catch (err) {
      toast('فشل إرجاع الحالات', 'error');
    } finally {
      setOperating(false);
    }
  };

  const updateStatus = async (task: AssignmentRow, action: 'completed' | 'no_answer' | 'unreachable') => {
    setOperating(true);
    try {
      // Logic:
      // If completed: status = completed, volunteer_id stays me.
      // If no_answer/unreachable: status = pending, volunteer_id = null (Return to pool!)
      
      const newStatus = action === 'completed' ? 'completed' : 'pending';
      const newVolunteer = action === 'completed' ? profile?.id : null;

      const updates = {
        status: newStatus,
        volunteer_id: newVolunteer,
        completed_at: action === 'completed' ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('case_assignments')
        .update(updates)
        .eq('id', task.id);

      if (error) throw error;

      // Log action
      await supabase.from('case_history').insert({
        family_id: task.family.id,
        campaign_id: id,
        user_id: profile?.id,
        user_name: profile?.full_name,
        action_type: action.toUpperCase(),
        description: action === 'completed' ? 'تم تحويل الأموال' : (action === 'no_answer' ? 'لم يرد واُرجعت الحالة' : 'مغلق/مشغول واُرجعت الحالة'),
        metadata: { returned_to_pool: action !== 'completed' }
      });

      toast(action === 'completed' ? '🎉 تم توثيق التحويل بنجاح' : 'تم إرجاع الحالة للمسبح للاستكمال لاحقاً', 'success');
      
      // Remove from MyTasks locally
      setMyTasks(prev => prev.filter(t => t.id !== task.id));
      if (expandedId === task.id) setExpandedId(null);
      fetchPoolStats();

    } catch (err) {
      toast('❌ فشل تحديث الحالة', 'error');
    } finally {
      setOperating(false);
    }
  };

  if (loading && !campaign) {
    return <div className="page-content"><div className="skeleton" style={{ height: '50vh', borderRadius: 24 }} /></div>;
  }

  const progressPercent = allStats.total > 0 ? (allStats.completed / allStats.total) * 100 : 0;

  return (
    <div className="page-content" style={{ paddingBottom: '5rem' }}>
      
      {/* Header & Campaign Info */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-ghost btn-sm mb-sm" onClick={() => navigate('/volunteer')} style={{ background: 'var(--surface)'}}>
            <ArrowRight size={18} /> العودة للحملات
          </button>
          <h1 className="page-title">{campaign?.name}</h1>
        </div>
      </div>

      {/* Progress Bar & Stats */}
      <div className="glass-card mb-6" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>نسبة إنجاز الحملة</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1 }}>{progressPercent.toFixed(1)}%</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>الحالات المستهدفة</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{allStats.completed} / {allStats.total}</div>
          </div>
        </div>
        <div className="progress-bar-container" style={{ background: 'rgba(255,255,255,0.2)', height: '8px' }}>
          <div className="progress-bar bg-white" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Pool Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button 
          className="btn btn-primary" 
          onClick={handleReserve} 
          disabled={operating || poolCount === 0}
          style={{ height: '60px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
            <Download size={18}/> حجز 10 حالات
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 500 }}>
            {poolCount > 0 ? `متاح ${poolCount} حالة` : 'لا يوجد حالات متاحة'}
          </div>
        </button>

        <button 
          className="btn btn-ghost" 
          onClick={handleRelease} 
          disabled={operating || myTasks.length === 0}
          style={{ height: '60px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px', background: 'white' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: 'var(--text)' }}>
            <RefreshCw size={18}/> إنهاء الجلسة
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>إرجاع ما لم يتم إنجازه</div>
        </button>
      </div>

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary-dark)' }}>
          مهامي الحالية ({myTasks.length})
        </h2>
        {operating && <div className="spinner" style={{ width: 20, height: 20, borderWidth: '2px' }} />}
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-4">
        {myTasks.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'white', borderRadius: '24px', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎣</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>شِباكك فارغة!</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>اضغط على "حجز حالات" للبدء في سحب مجموعة من المسبح للصيد المالي.</p>
          </div>
        ) : (
          myTasks.map(task => {
            const isExpanded = expandedId === task.id;
            const breakdown = campaign ? calculateDistribution(task.family, campaign) : null;
            
            return (
              <motion.div 
                key={task.id} 
                className="glass-card"
                layout
                style={{ 
                  borderRadius: '24px', 
                  background: 'white',
                  overflow: 'hidden',
                  border: isExpanded ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                  boxShadow: isExpanded ? '0 12px 24px rgba(6,147,100,0.1)' : '0 4px 12px rgba(0,0,0,0.02)'
                }}
              >
                {/* Accordion Header */}
                <div 
                  style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem' }}>
                      {task.family.mother_name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', marginBottom: '0.2rem' }}>{task.family.mother_name}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         {task.family.phone} • {task.family.district}
                      </div>
                    </div>
                  </div>
                  <div>
                    {isExpanded ? <ChevronUp color="var(--primary)" /> : <ChevronDown color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && breakdown && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ borderTop: '1px solid var(--border-light)' }}
                    >
                      <div style={{ padding: '1.25rem' }}>
                        
                        {/* Financial Report */}
                        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
                           <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                             <DollarSign size={16} /> تفصيل الاستحقاق المالي
                           </h4>
                           
                           {/* Children list */}
                           <div className="flex flex-col gap-2 mb-3">
                             {breakdown.childrenBreakdown.map((c, i) => (
                               <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                 <span>{c.name} <span style={{color:'var(--text-muted)', fontSize:'0.75rem'}}>({c.age} سنة)</span></span>
                                 <strong style={{ color: 'var(--primary-dark)' }}>{c.amount} ج.م</strong>
                               </div>
                             ))}
                           </div>

                           <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                             <span style={{ color: 'var(--text-muted)' }}>رسوم خدمة (فودافون كاش)</span>
                             <strong style={{ color: 'var(--orange)' }}>+{breakdown.fee} ج.م</strong>
                           </div>

                           <div style={{ background: 'white', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--gold)' }}>
                             <span style={{ fontWeight: 800 }}>الإجمالي المطلوب تحويله</span>
                             <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>{breakdown.total} <span style={{ fontSize: '0.8rem'}}>ج.م</span></span>
                           </div>
                        </div>

                        {/* Vodafone Cash & Call Buttons */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                           {/* V-Cash USSD Note: encoded '#' as '%23' */}
                           <a 
                             href={`tel:*9*7*${task.family.phone}*${breakdown.total}%23`}
                             className="btn btn-primary"
                             style={{ borderRadius: '12px', height: '52px', fontWeight: 800 }}
                           >
                             💳 كود التحويل السريع
                           </a>
                           <a 
                             href={`tel:${task.family.phone}`}
                             className="btn btn-secondary"
                             style={{ borderRadius: '12px', height: '52px', fontWeight: 800, background: '#f1f5f9', color: '#0f172a' }}
                           >
                             <Phone size={18} /> اتصال
                           </a>
                        </div>

                        {/* Status Actions */}
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center' }}>تحديث نتيجة التواصل</h4>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-primary btn-sm flex-1" 
                            style={{ background: 'var(--success)', border: 'none', borderRadius: '10px' }}
                            onClick={() => updateStatus(task, 'completed')}
                            disabled={operating}
                          >
                            <CheckCircle size={16} /> تم التحويل
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm flex-1" 
                            style={{ background: '#fff7ed', color: '#ea580c', border: 'none', borderRadius: '10px' }}
                            onClick={() => updateStatus(task, 'no_answer')}
                            disabled={operating}
                          >
                            جرس ولم يرد
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm flex-1" 
                            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '10px' }}
                            onClick={() => updateStatus(task, 'unreachable')}
                            disabled={operating}
                          >
                            مشغول/مغلق
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

    </div>
  );
}
