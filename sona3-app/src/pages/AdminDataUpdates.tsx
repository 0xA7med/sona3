import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, User, MapPin, Phone, ArrowLeft, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import type { DataUpdateRequest, Child } from '../types';

export default function AdminDataUpdates() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<DataUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('data_update_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) { setRequests([]); return; }

      const familyIds = [...new Set(data.map(r => r.family_id))];
      const volunteerIds = [...new Set(data.map(r => r.volunteer_id))];

      const [famRes, volRes] = await Promise.all([
        supabase.from('families').select('*, children(*)').in('id', familyIds),
        supabase.from('profiles').select('*').in('id', volunteerIds),
      ]);

      if (famRes.error) throw famRes.error;
      if (volRes.error) throw volRes.error;

      const familyMap = new Map((famRes.data || []).map(f => [f.id, f]));
      const volMap = new Map((volRes.data || []).map(p => [p.id, p]));

      setRequests(data.map(r => ({
        ...r,
        family: familyMap.get(r.family_id) || null,
        volunteer: volMap.get(r.volunteer_id) || null,
      })));
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (request: DataUpdateRequest) => {
    setProcessingId(request.id);
    try {
      const changes = request.requested_changes;

      // 1. Update Family
      if (changes.family) {
        const { error: famError } = await supabase
          .from('families')
          .update(changes.family)
          .eq('id', request.family_id);
        if (famError) throw famError;
      }

      // 2. Update/Insert Children
      if (changes.children && changes.children.length > 0) {
        for (const child of changes.children) {
          if (child.id) {
            // Update existing
            const { error: childError } = await supabase
              .from('children')
              .update({
                child_name: child.child_name,
                age: child.age,
                educational_grade: child.educational_grade
              })
              .eq('id', child.id);
            if (childError) throw childError;
          } else {
            // Insert new
            const { error: childError } = await supabase
              .from('children')
              .insert({
                family_id: request.family_id,
                child_name: child.child_name,
                age: child.age,
                educational_grade: child.educational_grade
              });
            if (childError) throw childError;
          }
        }
      }

      // 3. Mark request as approved
      const { error: reqError } = await supabase
        .from('data_update_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', request.id);
      
      if (reqError) throw reqError;

      toast('تم الموافقة على التعديلات وتحديث البيانات بنجاح', 'success');
      setRequests((prev: DataUpdateRequest[]) => prev.filter((r: DataUpdateRequest) => r.id !== request.id));
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('سبب الرفض (اختياري):');
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('data_update_requests')
        .update({ 
          status: 'rejected', 
          rejection_reason: reason,
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', requestId);

      if (error) throw error;
      setRequests((prev: DataUpdateRequest[]) => prev.filter((r: DataUpdateRequest) => r.id !== requestId));
      toast('تم رفض طلب التعديل', 'info');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/admin')} className="btn btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-dark)' }}>طلبات تعديل البيانات</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>مراجعة التحديثات المرسلة من المتطوعين</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '24px', border: '2px dashed var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
          <h3 style={{ fontWeight: 800, color: 'var(--text-muted)' }}>لا توجد طلبات معلقة حالياً</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {requests.map((req) => (
            <motion.div 
              key={req.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
              style={{ padding: '1.5rem', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem', margin: 0 }}>{req.family?.mother_name}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>بواسطة المتطوع: {req.volunteer?.full_name}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg)', padding: '4px 10px', borderRadius: '999px' }}>
                  📅 {new Date(req.created_at).toLocaleString('ar-EG')}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Proposed Changes */}
                <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '16px', border: '1px solid #bcf0da' }}>
                  <h5 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#065f46', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Save size={16} /> التعديلات المقترحة
                  </h5>
                  <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}><User size={14} /> {req.requested_changes.family?.mother_name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}><Phone size={14} /> {req.requested_changes.family?.phone}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}><MapPin size={14} /> {req.requested_changes.family?.address}</div>
                    
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(6,95,70,0.1)', paddingTop: '0.75rem' }}>
                      <p style={{ fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.5rem' }}>الأبناء ({req.requested_changes.children?.length})</p>
                      {req.requested_changes.children?.map((c, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', marginBottom: '0.25rem', background: 'rgba(255,255,255,0.5)', padding: '4px 8px', borderRadius: '6px' }}>
                          {c.child_name} - {c.age} سنة - {c.educational_grade || 'بدون فصل'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Current Data */}
                <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)', opacity: 0.7 }}>
                  <h5 style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>البيانات الحالية</h5>
                  <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div>اسم الأم: {req.family?.mother_name}</div>
                    <div>الهاتف: {req.family?.phone}</div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>العنوان: {req.family?.address}</div>
                    
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      <p style={{ fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.5rem' }}>الأبناء ({req.family?.children?.length})</p>
                      {(req.family?.children as Child[])?.map((c, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          {c.child_name} - {c.age} سنة
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => handleReject(req.id)}
                  disabled={processingId === req.id}
                  style={{ color: 'var(--error)' }}
                >
                  <X size={18} /> رفض التعديل
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleApproval(req)}
                  disabled={processingId === req.id}
                >
                  {processingId === req.id ? 'جارٍ التنفيذ...' : 'موافقة وتحديث البيانات'}
                  <Check size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Rejection Prompt Style */}
      <style>{`
        .danger-badge { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
        .success-badge { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
      `}</style>
    </div>
  );
}
