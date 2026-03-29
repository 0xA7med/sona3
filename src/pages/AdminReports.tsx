import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Users, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminReports() {
  const [stats, setStats] = useState({
    totalDistributed: 0,
    totalFamilies: 0,
    activeCampaigns: 0,
    averagePerFamily: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const [
        { data: transactions },
        { count: families },
        { count: campaigns }
      ] = await Promise.all([
        supabase.from('transactions').select('amount').eq('status', 'completed'),
        supabase.from('families').select('*', { count: 'exact', head: true }),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active')
      ]);

      const total = (transactions ?? []).reduce((acc, curr) => acc + Number(curr.amount), 0);
      setStats({
        totalDistributed: total,
        totalFamilies: families ?? 0,
        activeCampaigns: campaigns ?? 0,
        averagePerFamily: families ? Math.round(total / families) : 0
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">التقارير والإحصائيات 📈</h1>
          <p className="page-subtitle">نظرة شاملة على الأداء المالي والعمليات الميدانية</p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 400 }} />
      ) : (
        <div className="stagger">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              label="إجمالي التبرعات الموزعة" 
              value={`${stats.totalDistributed.toLocaleString('ar-EG')} ج.م`} 
              icon={<DollarSign size={24} />} 
              trend="+12%" 
              trendType="up" 
            />
            <StatCard 
              label="العائلات المستفيدة" 
              value={stats.totalFamilies} 
              icon={<Users size={24} />} 
              trend="+5%" 
              trendType="up" 
            />
            <StatCard 
              label="متوسط نصيب الأسرة" 
              value={`${stats.averagePerFamily.toLocaleString('ar-EG')} ج.م`} 
              icon={<TrendingUp size={24} />} 
              trend="-2%" 
              trendType="down" 
            />
            <StatCard 
              label="الحملات القائمة" 
              value={stats.activeCampaigns} 
              icon={<Package size={24} />} 
              trend="مستقر" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Monthly Trend Placeholder */}
            <div className="glass-card">
              <h3 style={{ fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} /> معدل التوزيع الشهري
              </h3>
              <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.1 }}
                    style={{ flex: 1, background: h === 100 ? 'var(--primary)' : 'var(--primary-light)', borderRadius: '6px 6px 4px 4px', position: 'relative' }}
                  >
                    <div style={{ position: 'absolute', bottom: '-1.5rem', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      شهر {i + 1}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Distribution by Zone */}
            <div className="glass-card">
              <h3 style={{ fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} /> التوزيع الجغرافي
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {[
                  { label: 'القاهرة', val: 75, color: '#068f64' },
                  { label: 'الجيزة', val: 55, color: '#d4af37' },
                  { label: 'الإسكندرية', val: 40, color: '#3b82f6' },
                  { label: 'أخرى', val: 20, color: '#9ca3af' },
                ].map((z) => (
                  <div key={z.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                      <span>{z.label}</span>
                      <span>{z.val}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--surface)', borderRadius: '999px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${z.val}%` }}
                        style={{ height: '100%', background: z.color }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, trend, trendType }: any) {
  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
          {icon}
        </div>
        {trend && (
          <div style={{ 
            fontSize: '0.72rem', fontWeight: 800, 
            color: trendType === 'up' ? '#10b981' : trendType === 'down' ? '#ef4444' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '0.2rem'
          }}>
            {trendType === 'up' ? <ArrowUpRight size={14} /> : trendType === 'down' ? <ArrowDownRight size={14} /> : null}
            {trend}
          </div>
        )}
      </div>
      <div style={{ marginTop: '1.25rem' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}
