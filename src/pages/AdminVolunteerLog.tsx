import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Phone, MapPin, 
  DollarSign, Shield, Send, RefreshCw, MessageSquare,
  Activity, Award, User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import { HISTORY_ACTION_LABELS, ASSIGNMENT_STATUS_LABELS } from '../types';
import type { Profile, Transaction, CaseHistoryEvent } from '../types';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function AdminVolunteerLog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState<Profile | null>(null);
  const [history, setHistory]     = useState<CaseHistoryEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fundAmount, setFundAmount] = useState(0);
  const [funding, setFunding]     = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isWalletConfirmOpen, setIsWalletConfirmOpen] = useState(false);
  const [walletActionType, setWalletActionType] = useState<'add' | 'sub'>('add');
  const [activeTab, setActiveTab] = useState<'log' | 'fin'>('fin');

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    if (!id) return;
    setLoading(true);
    try {
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (pErr) throw pErr;
      setVolunteer(prof);

      const [histRes, txRes, transRes] = await Promise.all([
        supabase.from('case_history').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('volunteer_id', id).order('created_at', { ascending: false }),
        supabase.from('volunteer_fund_transfers').select('*').eq('receiver_id', id)
      ]);

      if (histRes.error) throw histRes.error;
      if (txRes.error) throw txRes.error;
      if (transRes.error) throw transRes.error;

      const familyIds = new Set([
        ...histRes.data.map(h => h.family_id),
        ...txRes.data.map(t => t.family_id)
      ].filter(Boolean));

      const campaignIds = new Set([
        ...histRes.data.map(h => h.campaign_id)
      ].filter(Boolean));

      const [famsRes, campsRes] = await Promise.all([
        supabase.from('families').select('id, mother_name, district').in('id', Array.from(familyIds)),
        supabase.from('campaigns').select('id, name').in('id', Array.from(campaignIds))
      ]);

      const famMap = (famsRes.data || []).reduce((acc: any, f) => ({ ...acc, [f.id]: f }), {});
      const campMap = (campsRes.data || []).reduce((acc: any, c) => ({ ...acc, [c.id]: c }), {});

      const mappedHistory = (histRes.data || []).map(h => ({
        ...h,
        family: famMap[h.family_id],
        campaign: campMap[h.campaign_id]
      }));

      const mappedTransactions = (txRes.data || []).map(t => ({
        ...t,
        family: famMap[t.family_id]
      }));

      setHistory(mappedHistory as CaseHistoryEvent[]);
      setTransactions(mappedTransactions as Transaction[]);
      setTransfers(transRes.data || []);

    } catch (err: any) {
      console.error('Fetch error:', err);
      toast('تعذر تحميل البيانات بشكل كامل', 'error');
    } finally {
      setLoading(false);
    }
  }

  const toggleStatus = async () => {
    if (!volunteer) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !volunteer.is_active })
        .eq('id', id);
      if (error) throw error;
      toast(`✅ تم ${volunteer.is_active ? 'تعطيل' : 'تنشيط'} العضو بنجاح`, 'success');
      setIsConfirmOpen(false);
      fetchData();
    } catch (err) {
      toast('❌ فشل تغيير الحالة', 'error');
    }
  };

  const handleWalletAction = async () => {
    if (fundAmount <= 0) return;
    setFunding(true);
    try {
      const finalAmount = walletActionType === 'add' ? fundAmount : -fundAmount;
      const { error } = await supabase
        .from('volunteer_fund_transfers')
        .insert({
          receiver_id: id,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          amount: finalAmount,
          notes: walletActionType === 'add' ? 'شحن إداري' : 'سحب إداري'
        });

      if (error) throw error;
      toast(`✅ تم ${walletActionType === 'add' ? 'شحن' : 'سحب'} الرصيد بنجاح`, 'success');
      setFundAmount(0);
      setIsWalletConfirmOpen(false);
      fetchData(); 
    } catch (err: any) {
      toast('❌ فشل العملية المالية', 'error');
    } finally {
      setFunding(false);
    }
  };

  const totalTransfers = transfers.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalSpent = transactions.reduce((acc, t) => acc + (t.total_amount || t.amount || 0), 0);
  const currentBalance = totalTransfers - totalSpent;

  const financialLog = [
    ...transactions.map(t => ({ id: t.id, type: 'spent', amount: -(t.total_amount || t.amount || 0), title: t.family?.mother_name || 'صرف ميداني', date: t.created_at })),
    ...transfers.map(t => ({ id: t.id, type: t.amount > 0 ? 'fund' : 'sub', amount: t.amount, title: t.notes || 'تحويل إداري', date: t.created_at }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) return <div className="page-content"><div className="skeleton" style={{ height: 400 }} /></div>;
  if (!volunteer) return <div className="page-content">العضو غير موجود</div>;
  
  return (
    <div className="page-content" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* 1. Elite Integrated Header */}
      <div className="card shadow-lg mb-8 overflow-hidden" style={{ border: 'none', borderRadius: '35px', background: 'white' }}>
        <div style={{ 
          height: '280px', 
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem'
        }}>
          {/* Internal Nav */}
          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', left: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <button className="btn-glass" onClick={() => navigate('/admin/volunteers')}>
               <ArrowRight size={20} /> العودة للفريق
             </button>
             <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600 }}>إدارة شئون الأعضاء</div>
          </div>

          <h1 style={{ color: 'white', fontSize: '3.2rem', fontWeight: 900, margin: 0, textShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            {volunteer.full_name}
          </h1>
          
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={16} /> <span>{volunteer.phone || 'بدون هاتف'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={16} /> <span>{volunteer.zone || 'المنطقة غير محددة'}</span>
            </div>
          </div>

            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '0.4rem 1.25rem', borderRadius: '12px', backdropFilter: 'blur(5px)', fontSize: '0.9rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
                {volunteer.role === 'admin' ? 'مدير نظام' : 'عضو فريق'}
              </span>
              <button 
                className={`btn-status ${volunteer.is_active ? 'active' : 'inactive'}`}
                onClick={() => setIsConfirmOpen(true)}
              >
                {volunteer.is_active ? 'حساب نشط' : 'حساب معطل'}
              </button>
            </div>

          {/* Overlapping Avatar */}
          <div style={{ position: 'absolute', bottom: '-45px', padding: '6px', background: 'white', borderRadius: '35px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>
             <div style={{ width: 90, height: 90, borderRadius: '28px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                👤
             </div>
          </div>
        </div>
        
        <div style={{ paddingTop: '60px', paddingBottom: '2rem', display: 'flex', justifyContent: 'center', gap: '3rem' }}>
           <div className="mini-stat">
              <span className="label">تاريخ الانضمام</span>
              <span className="val">{new Date(volunteer.created_at).toLocaleDateString('ar-EG')}</span>
           </div>
        </div>
      </div>

      {/* 2. Unified Wallet & Mastery Panel */}
      <div className="mb-8">
        <div className="card shadow-sm p-8" style={{ background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
             <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>الإدارة المالية والتشغيلية</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>التحكم في أرصدة الشحن والخصم لأغراض التنفيذ الميداني</p>
             </div>
             <div style={{ width: 50, height: 50, borderRadius: '15px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <DollarSign size={28} />
             </div>
          </div>

          <div className="wallet-grid">
             <div className="wallet-stat">
                <div className="wallet-label">الرصيد المتاح حالياً</div>
                <div className="wallet-balance">
                   {currentBalance.toLocaleString('ar-EG')} <span className="currency">ج.م</span>
                </div>
             </div>

             <div className="wallet-divider"></div>

             <div className="wallet-actions">
                <label className="action-label">تنفيذ عملية مالية جديدة</label>
                <div className="action-row">
                   <input 
                     type="number" className="input wallet-input" placeholder="أدخل المبلغ..." 
                     value={fundAmount || ''} onChange={e => setFundAmount(Number(e.target.value))}
                   />
                   <div className="btn-group">
                      <button 
                        className="btn-action-sub"
                        onClick={() => { setWalletActionType('sub'); setIsWalletConfirmOpen(true); }}
                        disabled={fundAmount <= 0}
                      > - </button>
                      <button 
                        className="btn-action-add"
                        onClick={() => { setWalletActionType('add'); setIsWalletConfirmOpen(true); }}
                        disabled={fundAmount <= 0}
                      > + </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Records (Vertical Flow) */}
      <div className="card shadow-sm mb-12 overflow-hidden" style={{ border: 'none', borderRadius: '30px' }}>
         <div style={{ display: 'flex', background: '#f8fafc', padding: '0.5rem', borderBottom: '2px solid #f1f5f9' }}>
            <button className={`tab-link ${activeTab === 'fin' ? 'active' : ''}`} onClick={() => setActiveTab('fin')}>
               <Activity size={18} /> كشف العمليات المالية
            </button>
            <button className={`tab-link ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>
               <Award size={18} /> سجل الإنجاز العملي
            </button>
         </div>

         <div style={{ padding: '0' }}>
            {activeTab === 'fin' ? (
              <div className="table-wrapper">
                 <table className="custom-table">
                    <thead>
                       <tr>
                          <th>البيان / التفاصيل</th>
                          <th>النوع</th>
                          <th>المبلغ</th>
                          <th>التاريخ والوقت</th>
                       </tr>
                    </thead>
                    <tbody>
                       {financialLog.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>لا توجد عمليات مسجلة</td></tr>
                       ) : (
                          financialLog.map(item => (
                            <tr key={item.id}>
                               <td style={{ fontWeight: 800 }}>{item.title}</td>
                               <td className="type-cell">
                                  <span className={`type-tag ${item.type}`}>
                                     {item.type === 'fund' ? 'إيداع إداري' : item.type === 'sub' ? 'سحب إداري' : 'صرف حالة'}
                                  </span>
                               </td>
                               <td style={{ color: item.amount > 0 ? '#059669' : '#dc2626', fontWeight: 900, direction: 'ltr' }}>
                                  {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString('ar-EG')}
                               </td>
                               <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                  {new Date(item.date).toLocaleString('ar-EG')}
                               </td>
                            </tr>
                          ))
                       )}
                    </tbody>
                 </table>
              </div>
            ) : (
              <div style={{ padding: '2rem' }}>
                 <div className="timeline-v">
                    {history.length === 0 ? (
                       <div className="empty-state">لا يوجد نشاط مسجل بعد لهذا العضو</div>
                    ) : (
                       history.map((item) => {
                         const action = HISTORY_ACTION_LABELS[item.action_type as keyof typeof HISTORY_ACTION_LABELS] || { label: item.action_type, emoji: '📝' };
                         return (
                           <div key={item.id} className="timeline-v-item">
                              <div className="marker"></div>
                              <div className="content">
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h4 style={{ margin: 0, fontWeight: 900 }}>{action.label}</h4>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(item.created_at).toLocaleString('ar-EG')}</span>
                                 </div>
                                 <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#475569' }}>
                                    {item.description || <>التعامل مع حالة في <b>{item.family?.mother_name}</b></>}
                                 </p>
                              </div>
                           </div>
                         );
                       })
                    )}
                 </div>
              </div>
            )}
         </div>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={toggleStatus}
        title={volunteer.is_active ? 'تعطيل العضو؟' : 'تنشيط العضو؟'}
        message={volunteer.is_active ? 'لن يتمكن هذا العضو من دخول النظام حتى إشعار آخر.' : 'سيتم السماح للعضو بالوصول للمهام مرة أخرى.'}
        type={volunteer.is_active ? 'danger' : 'primary'}
      />

      <ConfirmModal 
        isOpen={isWalletConfirmOpen}
        onClose={() => setIsWalletConfirmOpen(false)}
        onConfirm={handleWalletAction}
        title={walletActionType === 'add' ? 'تأكيد إضافة رصيد' : 'تأكيد سحب رصيد'}
        message={`هل أنت متأكد من تنفيذ عملية ${walletActionType === 'add' ? 'إضافة' : 'سحب'} مبلغ ${fundAmount} ج.م من محفظة ${volunteer.full_name}؟`}
        type={walletActionType === 'add' ? 'primary' : 'danger'}
      />

      <style>{`
        .btn-glass { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 12px; backdrop-filter: blur(8px); display: flex; alignItems: center; gap: 0.5rem; fontWeight: 700; transition: 0.2s; }
        .btn-glass:hover { background: rgba(255,255,255,0.25); }
        .btn-status { border: 1px solid rgba(255,255,255,0.2); padding: 0.4rem 1rem; border-radius: 12px; font-size: 0.8rem; font-weight: 800; cursor: pointer; transition: 0.3s; backdrop-filter: blur(5px); }
        .btn-status.active { background: #dcfce7; color: #166534; border: none; }
        .btn-status.inactive { background: #fee2e2; color: #991b1b; border: none; }
        .btn-status:hover { opacity: 0.9; transform: scale(1.05); }
        .btn-action-add { width: 55px; height: 55px; background: #059669; color: white; border: none; border-radius: 16px; font-size: 1.8rem; font-weight: 300; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(5,150,105,0.2); }
        .btn-action-sub { width: 55px; height: 55px; background: #fee2e2; color: #dc2626; border: none; border-radius: 16px; font-size: 1.8rem; font-weight: 300; cursor: pointer; transition: 0.2s; }
        .btn-action-add:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(5,150,105,0.3); }
        .btn-action-sub:hover { transform: translateY(-2px); background: #fecaca; }
        .btn-action-add:active, .btn-action-sub:active { transform: translateY(0); }
        .wallet-grid { display: grid; grid-template-columns: 1fr 2px 1.5fr; gap: 3rem; align-items: center; }
        .wallet-stat { text-align: center; }
        .wallet-label { font-size: 0.85rem; font-weight: 800; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px; }
        .wallet-balance { font-size: 3.5rem; font-weight: 900; color: #0f172a; letter-spacing: -2px; }
        .wallet-balance .currency { font-size: 1.25rem; color: #94a3b8; }
        .wallet-divider { height: 80px; background: #f1f5f9; }
        .action-label { display: block; fontSize: 0.85rem; fontWeight: 800; color: #475569; marginBottom: 0.75rem; }
        .action-row { display: flex; gap: 0.75rem; }
        .wallet-input { border: 2px solid #f1f5f9 !important; border-radius: 16px !important; fontSize: 1.1rem !important; padding: 1rem !important; flex: 1; }
        .btn-group { display: flex; gap: 0.6rem; }

        @media (max-width: 768px) {
          .wallet-grid { grid-template-columns: 1fr; gap: 2rem; }
          .wallet-divider { display: none; }
          .wallet-balance { font-size: 2.5rem; }
          .action-row { flex-direction: column; }
          .btn-group { justify-content: center; width: 100%; }
          .btn-action-add, .btn-action-sub { flex: 1; }
        }
        .mini-stat { text-align: center; }
        .mini-stat .label { display: block; fontSize: 0.7rem; fontWeight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.25rem; }
        .mini-stat .val { display: block; fontSize: 1.1rem; fontWeight: 900; }
        .text-green { color: #059669; }
        .text-red { color: #dc2626; }
        .tab-link { flex: 1; padding: 1.25rem; border: none; background: transparent; font-weight: 900; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.75rem; transition: 0.3s; }
        .tab-link.active { color: #064e3b; background: white; border-top: 3px solid #064e3b; }
        .custom-table { width: 100%; border-collapse: collapse; }
        .custom-table th { background: #f8fafc; padding: 1.25rem; text-align: right; fontSize: 0.85rem; color: #475569; border-bottom: 2px solid #f1f5f9; }
        .custom-table td { padding: 1.25rem; border-bottom: 1px solid #f1f5f9; fontSize: 0.95rem; }
        .type-tag { padding: 0.25rem 0.75rem; borderRadius: 8px; fontSize: 0.75rem; fontWeight: 800; }
        .type-tag.fund { background: #dcfce7; color: #166534; }
        .type-tag.sub { background: #fee2e2; color: #991b1b; }
        .type-tag.spent { background: #f1f5f9; color: #475569; }
        .timeline-v { position: relative; padding-right: 2rem; border-right: 2px solid #f1f5f9; }
        .timeline-v-item { position: relative; padding-bottom: 2rem; padding-right: 1.5rem; }
        .timeline-v-item .marker { position: absolute; right: -7px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: #065f46; border: 2px solid white; box-shadow: 0 0 0 4px #f0fdf4; }
        .timeline-v-item .content { background: #f8fafc; padding: 1rem; border-radius: 15px; border: 1px solid #f1f5f9; }
      `}</style>
    </div>
  );
}
