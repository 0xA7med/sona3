import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // للتحقق من أن الطلب قادم من Vercel Cron Job فقط (خطوة أمان)
  // يمكنك إضافة متغير CRON_SECRET في إعدادات Vercel
  if (
    process.env.CRON_SECRET &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'غير مصرح لك' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'متغيرات البيئة غير موجودة' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // عمل استعلام بسيط جداً لتنشيط قاعدة البيانات
    const { data, error } = await supabase
      .from('families')
      .select('id')
      .limit(1);

    if (error) {
       console.log('تم التنشيط، لكن حدث خطأ في الاستعلام:', error.message);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'تم تنشيط قاعدة البيانات بنجاح للحفاظ عليها من الإيقاف.'
    });
  } catch (error: any) {
    console.error('Ping error:', error);
    return res.status(500).json({ error: error?.message || 'خطأ داخلي' });
  }
}
