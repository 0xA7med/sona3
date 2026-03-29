import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  MapPin, Phone, Calendar, CheckCircle, 
  Clock, ExternalLink, RefreshCw 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '../components/Toast';

interface Assignment {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'no_answer' | 'unreachable';
  assigned_at: string;
  family: {
    id: string;
    full_name: string;
    phone: string;
    address: string;
    zone: string;
    priority_score: number;
  };
}

export default function VolunteerTasks() {
  const { profile } = useAuthStore();
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchTasks();
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
            full_name,
            phone,
            address,
            zone,
            priority_score
          )
        `)
        .eq('volunteer_id', profile?.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setTasks(data as any[] || []);
    } catch (err: any) {
      console.error(err);
      toast('حدث خطأ في جلب المهام', 'error');
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('case_assignments')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
      toast('✅ تم تحديث حالة المهمة', 'success');
    } catch (err: any) {
      toast('❌ فشل خديث الحالة', 'error');
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
          <h1 className="page-title">مهامي الميدانية</h1>
          <p className="page-subtitle">إدارة الحالات الموكلة إليك حالياً</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchTasks} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
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
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{task.family.full_name}</h3>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                    {getStatusBadge(task.status)}
                    <span className="priority-badge" style={{ 
                      background: task.family.priority_score > 7 ? '#fef2f2' : '#f0fdf4',
                      color: task.family.priority_score > 7 ? '#ef4444' : '#16a34a'
                    }}>
                      أولوية {task.family.priority_score}
                    </span>
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'left' }}>
                  <Calendar size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  {new Date(task.assigned_at).toLocaleDateString('ar-EG')}
                </div>
              </div>

              <div className="case-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <MapPin size={16} color="var(--primary)" />
                    <span>{task.family.zone} — {task.family.address}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Phone size={16} color="var(--primary)" />
                    <a href={`tel:${task.family.phone}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>{task.family.phone}</a>
                  </div>
                </div>
              </div>

              <div className="case-card-footer">
                {task.status !== 'completed' ? (
                  <>
                    <button 
                      className="btn btn-primary btn-sm flex-1"
                      onClick={() => updateStatus(task.id, 'completed')}
                    >
                      <CheckCircle size={16} /> مكتمل
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={() => updateStatus(task.id, 'in_progress')}
                    >
                      <Clock size={16} /> قيد العمل
                    </button>
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
