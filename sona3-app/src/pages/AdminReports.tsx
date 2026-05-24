import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, DollarSign, Users, Package, 
  MapPin, BarChart3, Activity,
  Heart, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import { calculateDistribution } from '../lib/distributionService';
import type { Campaign, Family } from '../types';

export default function AdminReports() {
  const [stats, setStats] = useState({
    totalDistributed: 0,
    totalFamilies: 0,
    activeCampaigns: 0,
    completedCases: 0,
    orphanCount: 0,
    districtStats: [] as any[],
  });
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch data in parallel for efficiency
      const [
        { data: assignments },
        { count: familiesCount },
        { data: activeCampaigns },
        { data: childrenData },
        { data: weeklyRaw }
      ] = await Promise.all([
        supabase.from('case_assignments')
          .select(`
            id, status,
            campaign:campaigns(id, amount_per_family, is_auto_calculate, distribution_mode,
              age_brackets, stage_brackets, children_brackets, commission_rules, targeting_rules),
            family:families(id, children(id, child_name, age, is_orphan, school_stage, birth_date, national_id))
          `)
          .eq('status', 'completed'),
        supabase.from('families').select('*', { count: 'exact', head: true }),
        supabase.from('campaigns').select('id').eq('status', 'active'),
        supabase.from('children').select('is_orphan'),
        supabase.from('case_assignments')
          .select('completed_at')
          .eq('status', 'completed')
          .gte('completed_at', sevenDaysAgo.toISOString())
      ]);

      // Accurate total: dynamic calculation for auto-calculate campaigns
      const totalValue = (assignments ?? []).reduce((acc: number, curr: any) => {
        if (!curr.campaign) return acc;
        if (curr.campaign.is_auto_calculate && curr.family) {
          const dist = calculateDistribution(curr.family as Family, curr.campaign as Campaign);
          return acc + dist.baseAmount;
        }
        return acc + (curr.campaign.amount_per_family || 0);
      }, 0);
      const orphans = (childrenData ?? []).filter(c => c.is_orphan).length;

      // Group by district
      const { data: districtRaw } = await supabase.from('families').select('district');
      const distMap: Record<string, number> = {};
      districtRaw?.forEach(f => {
        if (f.district) distMap[f.district] = (distMap[f.district] || 0) + 1;
      });
      const districtStats = Object.entries(distMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Weekly Chart Logic
      const counts = new Array(7).fill(0);
      weeklyRaw?.forEach(a => {
        const day = new Date(a.completed_at).getDay(); // 0-6
        counts[day]++;
      });
      setWeeklyData(counts);

      setStats({
        totalDistributed: totalValue,
        totalFamilies: familiesCount || 0,
        activeCampaigns: activeCampaigns?.length || 0,
        completedCases: assignments?.length || 0,
        orphanCount: orphans,
        districtStats
      });
    } catch (err) {
      toast('تعذر تحميل الإحصائيات الحقيقية', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">لوحة مؤشرات الأداء 🚀</h1>
          <p className="page-subtitle">تحليل البيانات الحية للعمليات الميدانية والتدفقات المالية</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchStats}>
          <Calendar size={18} /> تحديث اليوم
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
        </div>
      ) : (
        <div className="stagger">
          {/* Top Row Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <BigStatCard 
              label="إجمالي المبالغ المنفذة" 
              value={`${stats.totalDistributed.toLocaleString('ar-EG')} ج.م`}
              icon={<DollarSign size={24} />}
              color="#068f64"
              sub="عبر كافة الحملات"
            />
            <BigStatCard 
              label="الأطراف المستفيدة" 
              value={stats.totalFamilies}
              icon={<Users size={24} />}
              color="#d4af37"
              sub={`${stats.orphanCount} طفل يتيم`}
            />
            <BigStatCard 
              label="عمليات التوزيع" 
              value={stats.completedCases}
              icon={<Activity size={24} />}
              color="#3b82f6"
              sub="حالات محولة بنجاح"
            />
            <BigStatCard 
              label="الحملات النشطة" 
              value={stats.activeCampaigns}
              icon={<Package size={24} />}
              color="#032a1e"
              sub="جاري العمل عليها حالياً"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Growth Chart Area */}
            <div className="lg:col-span-2 glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <BarChart3 size={20} color="var(--primary)" /> معدلات التوزيع الأسبوعية
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>آخر 7 أيام</div>
              </div>
              
              <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '5%', paddingBottom: '2.5rem', position: 'relative' }}>
                {/* Simple Decorative Grid Lines */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'var(--border)', opacity: 0.3 }} />
                <div style={{ position: 'absolute', top: '33%', left: 0, right: 0, height: '1px', background: 'var(--border)', opacity: 0.3 }} />
                <div style={{ position: 'absolute', top: '66%', left: 0, right: 0, height: '1px', background: 'var(--border)', opacity: 0.3 }} />

                {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map((day, i) => {
                  const val = weeklyData[i] || 0;
                  const maxVal = Math.max(...weeklyData, 5); // Fallback to 5 to avoid division by zero
                  const h = (val / maxVal) * 100;

                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(h, 5)}%` }} // Minimum height for visibility
                        transition={{ delay: i * 0.1, type: 'spring' }}
                        style={{ 
                          width: '100%', 
                          maxWidth: '40px',
                          background: i === new Date().getDay() ? 'var(--primary)' : 'var(--primary-light)', 
                          borderRadius: '10px 10px 4px 4px',
                          position: 'relative',
                          boxShadow: i === new Date().getDay() ? '0 10px 20px rgba(6,143,100,0.2)' : 'none'
                        }} 
                      >
                        {val > 0 && (
                          <div style={{ position: 'absolute', top: -20, left: 0, right: 0, textAlign: 'center', fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary-dark)' }}>
                            {val}
                          </div>
                        )}
                      </motion.div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)' }}>
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Geographical Distribution */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
                <MapPin size={20} color="var(--gold)" /> النطاق الجغرافي
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {stats.districtStats.length > 0 ? stats.districtStats.map((d, i) => (
                  <div key={d.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 800 }}>
                      <span>{d.label}</span>
                      <span style={{ color: 'var(--primary)' }}>{d.count} أسرة</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(6,143,100,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(d.count / stats.totalFamilies) * 100}%` }}
                        style={{ height: '100%', background: i === 0 ? 'var(--primary)' : i === 1 ? 'var(--gold)' : 'var(--text-light)' }} 
                      />
                    </div>
                  </div>
                )) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem 0' }}>لا تتوفر بيانات مناطق حالياً</p>
                )}
              </div>

              <div style={{ marginTop: '2.5rem', padding: '1rem', background: 'rgba(6,143,100,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>الأداء الأسبوعي</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>زيادة بنسبة 4.2% عن الشهر الماضي</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BigStatCard({ label, value, icon, color, sub }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass-card" 
      style={{ borderBottom: `4px solid ${color}`, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)' }}>{value}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.2rem' }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Heart size={10} fill="currentColor" /> {sub}
        </div>
      </div>
    </motion.div>
  );
}
