import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RAW_CHILDREN = [
  {id:1,  motherName:"سهير السيد صالح محمد",        phone:"01017351390", childName:"قمر السيد محمد عبدالله",              age:12, grade:"الصف الأول الاعدادي",       address:"عزبة الزطوط الجبل - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:2,  motherName:"سهير السيد صالح محمد",        phone:"01017351390", childName:"سما السيد محمد عبدالله",              age:16, grade:"الصف الثاني الثانوي",        address:"عزبة الزطوط الجبل - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:3,  motherName:"دينا رجب رجب عيدالعال",       phone:"01009853314", childName:"ملك محمود مهدي",                      age:17, grade:"الصف الثالث الثانوي",        address:"عزبة الزطوط الترعة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:4,  motherName:"دينا رجب رجب عيدالعال",       phone:"01009853314", childName:"سامي محمود مهدي",                     age:13, grade:"الصف الثاني الاعدادي",       address:"عزبة الزطوط الترعة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:5,  motherName:"صفاء حلمي حسن منصور",         phone:"01020296447", childName:"حلمي محمود عبدالله عبدالرحمن",       age:12, grade:"الصف الأول الاعدادي",       address:"ابو سميمة - عين تمصين - مركز الاسماعيلية"},
  {id:6,  motherName:"رنيه حلمي حسن منصور",         phone:"01068035279", childName:"هنا محمود ثابت محمود عبدالله",       age:12, grade:"الصف الخامس الابتدائي",      address:"ش زطوط الجبل - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:7,  motherName:"هدير قاسم عبدالوهاب حامد",    phone:"01095881342", childName:"فرحه محمود ثابت محمود عبد المحمد",  age:10, grade:"الصف الخامس الابتدائي",      address:"العيادة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:8,  motherName:"هدير قاسم عبدالوهاب حامد",    phone:"01095881342", childName:"محمد محمود ثابت محمود عبد المحمد",  age:13, grade:"الصف الأول الاعدادي",       address:"العيادة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:9,  motherName:"هدير قاسم عبدالوهاب حامد",    phone:"01095881342", childName:"عمر محمود ثابت محمود عبد المحمد",   age:7,  grade:"الصف الثاني الابتدائي",      address:"العيادة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:10, motherName:"حسناء ابراهيم الحلاوي",       phone:"01030261458", childName:"يوسف عبدالناصر حلمي شحات",           age:11, grade:"الصف السادس الابتدائي",      address:"عزية العيادة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:11, motherName:"حسناء ابراهيم الحلاوي",       phone:"01030261458", childName:"محمود عبدالناصر حلمي شحات",          age:14, grade:"الصف الثالث الاعدادي",       address:"عزية العيادة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:12, motherName:"بدور بلاص عطية محمد",         phone:"01021392937", childName:"محمد ابراهيم عبده محمد ابراهيم",    age:13, grade:"الصف الثاني الثانوي",        address:"سرابيوم مجمع المدارس - التقليجات - مركز فايد"},
  {id:13, motherName:"صفية حامد عبدالله على",       phone:"01127415722", childName:"فيه عبدالله على عبدالله على",        age:15, grade:"الصف الأول الثانوي",         address:"العيادة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:14, motherName:"بثينه يونس حسن محمد",         phone:"01276343781", childName:"بسنت جلال السيد سلامه",              age:16, grade:"الصف الأول الثانوي",         address:"عزبة الزطوط الوسطى - سرابيوم - مركز فايد"},
  {id:15, motherName:"ناديه عاطف حسن محمد",         phone:"01026049712", childName:"هنا احمد محمد احمد السيد",           age:9,  grade:"الصف الرابع الابتدائي",      address:"حمادة ابوتناصر - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:16, motherName:"ناديه عاطف حسن محمد",         phone:"01026049712", childName:"محمد احمد محمد احمد السيد",          age:11, grade:"الصف السادس الابتدائي",      address:"حمادة ابوتناصر - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:17, motherName:"ناديه عاطف حسن محمد",         phone:"01026049712", childName:"سما احمد محمد احمد السيد",           age:13, grade:"الصف الثاني الاعدادي",       address:"حمادة ابوتناصر - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:18, motherName:"صباح حسن احمد ابراهيم",      phone:"01028682104", childName:"هبة الله سامح السيد عثمان",          age:10, grade:"الصف الرابع الابتدائي",      address:"الحكر - الاسماعيلية"},
  {id:19, motherName:"ريهيم حسين عبدالعال",         phone:"01063113138", childName:"محمد رجب محمود جابر",                age:8,  grade:"الصف الثاني الابتدائي",      address:"ابو سميمة - بجانب الخقليجات - سرابيوم - مركز فايد"},
  {id:20, motherName:"رانيا رمضان محمود على",       phone:"01026419702", childName:"سامي المصطفى",                        age:15, grade:"الصف الرابع الثانوي",        address:"الخقليجات - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:21, motherName:"رانيا رمضان محمود على",       phone:"01026419702", childName:"مي مصطفى احمد على",                  age:12, grade:"الصف السادس الابتدائي",      address:"الخقليجات - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:22, motherName:"هاله محمد حسن محمد دهيش",    phone:"01070695253", childName:"من سليمان عبدالرحمن خنتم",           age:16, grade:"الصف السادس الثانوي",        address:"قبل الكيانية - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:23, motherName:"سماسم محمد ابراهيم محمد",    phone:"01012153572", childName:"عبدالحميد رلى على عبدالجميد",        age:12, grade:"الصف الأول الاعدادي",       address:"الخقليجات - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:24, motherName:"سماسم محمد ابراهيم محمد",    phone:"01012153572", childName:"امل قلى على عبدالجميو على",          age:17, grade:"الصف الثالث الاعدادي",       address:"الخقليجات - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:25, motherName:"نجلاء محمد محمد اسماعيل",    phone:"01025334684", childName:"جنات السيد عبدالرحيم",               age:14, grade:"الصف الثاني الابتدائي",      address:"الضبعية الغربية - بعد المجلس - مركز الاسماعيلية"},
  {id:26, motherName:"امل عبدالسلام مسلم عبدالرحمن",phone:"01033775404",childName:"ملك محمد سالم صادق شحات",            age:16, grade:"الصف الأول الثانوي",         address:"عزبة جود - بجوار مسجد المطفرة - الضبعية"},
  {id:27, motherName:"امل عبدالسلام مسلم عبدالرحمن",phone:"01033775404",childName:"عبدالرحمن حسن جمال حامد",           age:14, grade:"الصف الأول الاعدادي",       address:"عزبة جود - بجوار مسجد المطفرة - الضبعية"},
  {id:28, motherName:"انعام ربيع احمد بوساف",       phone:"01094372414", childName:"شيماء محمد عبده محمد ابراهيم",      age:13, grade:"الصف الثاني الثانوي",        address:"عزبة جود - بجوار مسجد المطفرة - الضبعية"},
  {id:29, motherName:"انعام ربيع احمد بوساف",       phone:"01094372414", childName:"رودينا محمد محمد عبدالرحمن",        age:10, grade:"الصف الخامس الابتدائي",      address:"الضبعية - مركز الاسماعيلية"},
  {id:30, motherName:"صفاء سعد السيد ابراهيم",     phone:"01020216855", childName:"علاء محمود وقريب محمدي",             age:6,  grade:"الصف الأول الابتدائي",      address:"عين تمصين - مركز الاسماعيلية"},
  {id:31, motherName:"ناهد فريد المسوى على",        phone:"01069774556", childName:"مالك عياد عادل محمد",                age:11, grade:"الصف الرابع الابتدائي",      address:"الضبعية - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:32, motherName:"صفاء سعد السيد مبارك",       phone:"01060989933", childName:"جودي على الجواد سالم محمد",          age:7,  grade:"الصف الثاني الاعدادي",       address:"الشيخه سالمة - عين تمصين - الاسماعيلية"},
  {id:33, motherName:"فاطمة منع هلل فريج",          phone:"01021094889", childName:"سثدس سليمان سعادة فراج",             age:14, grade:"الصف الثاني الاعدادي",       address:"سرابيوم - العاشر من رمضان - مركز فايد"},
  {id:34, motherName:"فاطمة منع هلل فريج",          phone:"01021094889", childName:"سجود سليمان سعادة فراج",             age:8,  grade:"الصف الثالث الابتدائي",      address:"سرابيوم - العاشر من رمضان - مركز فايد"},
  {id:35, motherName:"مديحة حدى عبادي مصطفى",      phone:"01016920153", childName:"سهيلة محمد منصور ناصر",              age:15, grade:"الصف الثالث الاعدادي",       address:"الضبعية - ابورعوف - سرابيوم - مركز فايد"},
  {id:36, motherName:"كريمة جمال حسان محمد",       phone:"01005456673", childName:"فهد السيد عبدالعزيز محمد",           age:8,  grade:"الصف الثالث الابتدائي",      address:"العيادة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:37, motherName:"كريمة جمال حسان محمد",       phone:"01005456673", childName:"شهد السيد عبدالعزيز محمد",           age:11, grade:"الصف السادس الابتدائي",      address:"العيادة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:38, motherName:"كريمة جمال حسان محمد",       phone:"01005456673", childName:"محمد السيد عبدالعزيز محمد",          age:13, grade:"الصف الأول الاعدادي",       address:"العيادة - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:39, motherName:"عزه عبدالحميد نكي جابر",     phone:"01028687165", childName:"حمزه احمد محمد عبدالرحمن",           age:8,  grade:"الثالث الابتدائي ازهر",       address:"شارع الجامع عمارات التليفونات المستقبل الاسماعيلية"},
  {id:40, motherName:"عزه عبدالحميد نكي جابر",     phone:"01028687165", childName:"عمر احمد محمد عبدالرحمن",            age:8,  grade:"الثالث الابتدائي ازهر",       address:"شارع الجامع عمارات التليفونات المستقبل الاسماعيلية"},
  {id:41, motherName:"سلمية سمير مجاهد حسن",       phone:"01063685219", childName:"نورا محمود على طفى",                  age:12, grade:"الصف الأول الابتدائي",      address:"الضبعية الغربية - بعد المجلس - مركز الاسماعيلية"},
  {id:42, motherName:"امل عبدالسلام مسلم",          phone:"01018829337", childName:"خثن جمال حامد يوسف كامل",            age:13, grade:"الصف الأول الثانوي",         address:"تقاطع شارع الخيل والبركة - الضبعية"},
  {id:43, motherName:"فاتن جمال جودة ابراهيم",     phone:"01067659144", childName:"يارا ابراهيم عبده محمد ابراهيم",     age:7,  grade:"الصف الأول الاعدادي",       address:"ام عروج - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:44, motherName:"فاتن جمال جودة ابراهيم",     phone:"01067659144", childName:"ادهم جمال جودة محمد ابراهيم",        age:10, grade:"الصف الخامس الابتدائي",      address:"ام عروج - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:45, motherName:"هيا على مجاهد محمد",          phone:"01207494170", childName:"طه على عبدالله على",                  age:15, grade:"الصف الأول الثانوي",         address:"عين تمصين - مركز الاسماعيلية"},
  {id:46, motherName:"هيا على مجاهد محمد",          phone:"01207494170", childName:"ليلى ابان عادل محمد",                 age:2,  grade:"طفلة",                        address:"سرابيوم - مركز فايد - الاسماعيلية"},
  {id:47, motherName:"هيا على مجاهد محمد",          phone:"01207494170", childName:"حمزه رضا عادل محمد",                  age:7,  grade:"الصف الأول الابتدائي",      address:"سرابيوم - مركز فايد - الاسماعيلية"},
  {id:48, motherName:"صفاء السيد على حسن",          phone:"01027056641", childName:"محمد حاتم عبدالجواد سالم محمد",      age:13, grade:"الصف الأول الاعدادي",       address:"شارع الجبالي - الضبعية - الاسماعيلية"},
  {id:49, motherName:"صفاء السيد على حسن",          phone:"01027056641", childName:"شروق ياسر على مصطفى محمد",           age:16, grade:"الصف الأول الثانوي",         address:"شارع الجبالي - الضبعية - الاسماعيلية"},
  {id:50, motherName:"عبده احمد محمد عبدالنعيم",   phone:"01007677653", childName:"مروز رزق محمد سعد",                   age:16, grade:"الصف الأول الثانوي",         address:"ابو طوطه - سرابيوم - منشية الشهداء - الاسماعيلية"},
  {id:51, motherName:"زينب حسين رمضان مصطفى",      phone:"01018144171", childName:"ناديا محمد معوض السيد",               age:17, grade:"الصف الأول الثانوي",         address:"191 حارة الزيتون بن العوام - هي السلام - الاسماعيلية"},
  {id:52, motherName:"سمر السيد يليه",              phone:"01015304218", childName:"شهد كرم جاد احمد",                    age:10, grade:"الصف الخامس الابتدائي",      address:"ابو طوطه - فريقة ابو شحاتة"},
  {id:53, motherName:"عبده حسن على عيلان",          phone:"01027757610", childName:"محمود حمدي رمضان حسين",              age:13, grade:"الصف الأول الاعدادي",       address:"تقيشه - مركز الاسماعيلية"},
  {id:54, motherName:"اعتماد ابراهيم عبدالحافظ",   phone:"01017062731", childName:"خثن محمد ابراهيم مرعى سليمان",       age:17, grade:"الثالث الزراعي",             address:"خلف قرية الابطال - القنطرة شرق - الاسماعيلية"},
  {id:55, motherName:"سميه داود زايد محمد",         phone:"01068334305", childName:"شهد عبد عيد حفاظ",                   age:11, grade:"السادس الابتدائي الازهر",     address:"ميت ابو الكرم - الابطال - القنطرة شرق"},
  {id:56, motherName:"تعمه موسى السيد محمد",        phone:"01012717889", childName:"شهد على السيد محمد على",              age:13, grade:"الثاني الاعدادي",             address:"سواده - مركز قالوس - الاسماعيلية"},
  {id:57, motherName:"اسماء عبدالحميد سليمان",      phone:"01003510417", childName:"وفاء حسن السيد محمد",                 age:16, grade:"الثاني الثانوي ازهر",        address:"سواده - مركز قالوس - الشرقية"},
  {id:58, motherName:"اسماء عبدالحميد سليمان",      phone:"01003510417", childName:"نور حسن السيد محمد",                  age:13, grade:"الصف الأول الثانوي",         address:"سواده - مركز قالوس - الشرقية"},
  {id:59, motherName:"انعام ربيع احمد بوساف",       phone:"01094372414", childName:"شيماء محمد عبده ابراهيم 2",           age:12, grade:"الصف الأول الاعدادي",       address:"ام عروج - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:60, motherName:"انعام ربيع احمد بوساف",       phone:"01094372414", childName:"شهد محمد عبده ابراهيم",               age:16, grade:"الثاني الثانوي",             address:"الضبعية - مركز الاسماعيلية"},
  {id:61, motherName:"ناهد فريد المسوى على",        phone:"01069774556", childName:"علاء محمود احمد",                     age:11, grade:"الصف السادس الابتدائي",      address:"الضبعية - مركز الاسماعيلية"},
  {id:62, motherName:"ناهد فريد المسوى على",        phone:"01069774556", childName:"محمد محمود احمد",                     age:9,  grade:"الصف الرابع الابتدائي",      address:"الضبعية - مركز الاسماعيلية"},
  {id:63, motherName:"شيماء عاطف حسنى على",        phone:"01001867511", childName:"هنا عاطف حسنى على على",               age:12, grade:"الصف الأول الاعدادي",       address:"الضبعية الشرقية - مركز الاسماعيلية"},
  {id:64, motherName:"شيماء عاطف حسنى على",        phone:"01001867511", childName:"هنا عاطف 2",                           age:6,  grade:"الصف الأول الابتدائي",      address:"الضبعية الشرقية - مركز الاسماعيلية"},
  {id:65, motherName:"هيه عبدالكريم السيد",         phone:"01015579478", childName:"سما علاء محمد صادق",                  age:13, grade:"الصف الأول الاعدادي",       address:"الضبعية - عزبة جود بجوار الفصل الواحد - مركز الاسماعيلية"},
  {id:66, motherName:"هيه عبدالكريم السيد",         phone:"01015579478", childName:"جنا علاء محمد صادق",                  age:13, grade:"الصف الأول الاعدادي",       address:"الضبعية - عزبة جود - مركز الاسماعيلية"},
  {id:67, motherName:"عزه عبدالمتعم محمد على",      phone:"01062544980", childName:"خبيبه مصطفى المصطفى",                 age:15, grade:"الصف الثالث الاعدادي",       address:"شارع فردي - عزبة ابو باغ - الاسماعيلية"},
  {id:68, motherName:"ياسمين صلاح السيد ابراهيم",  phone:"01067723881", childName:"احمد محمد السيد الميدانى",            age:11, grade:"الصف الخامس الابتدائي",      address:"الضبعية - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:69, motherName:"ياسمين صلاح السيد ابراهيم",  phone:"01067723881", childName:"ريتاج محمد السيد احمد",               age:13, grade:"الصف الثاني الاعدادي",       address:"الضبعية - سرابيوم - مركز فايد - الاسماعيلية"},
  {id:70, motherName:"فاطمة صلاح السيد ابراهيم",   phone:"01017218591", childName:"عبدالرحمن عيد ناصر سالم",             age:11, grade:"الصف الخامس الابتدائي",      address:"ترعة 5 - المنائف - ابوصدير - الاسماعيلية"},
  {id:71, motherName:"فاطمة مسعد عيد عوده",         phone:"01017218591", childName:"ياسمين عيد ناصر سالم",               age:11, grade:"الصف الأول الاعدادي",       address:"ترعة 5 - المنائف - ابوصدير - الاسماعيلية"},
  {id:72, motherName:"فاطمة مسعد عيد عوده",         phone:"01017218591", childName:"هاجر عيد ناصر سالم",                 age:16, grade:"الصف الثاني الثانوي",        address:"ترعة 5 - المنائف - ابوصدير - الاسماعيلية"},
  {id:73, motherName:"فاطمة مسعد عيد عوده",         phone:"01017218591", childName:"امنة عيد ناصر سالم",                 age:10, grade:"الصف الثالث الابتدائي",      address:"ترعة 5 - المنائف - ابوصدير - الاسماعيلية"},
  {id:74, motherName:"ورده جادالكريم جادالله",      phone:"01003885974", childName:"خثن جمال حامد يوسف محمد",            age:16, grade:"الصف الأول الثانوي",         address:"حمادة ابوتناصر - سرابيوم - مركز فايد"},
  {id:75, motherName:"ورده جادالكريم جادالله",      phone:"01003885974", childName:"عبدالرحمن حسن يوسف محمد",            age:10, grade:"الصف الثالث الابتدائي",      address:"حمادة ابوتناصر - سرابيوم - مركز فايد"},
  {id:76, motherName:"هنام صمصان صالح حسون",        phone:"01021989579", childName:"رودينا محمد عبدالرحمن عياد",         age:12, grade:"الصف الخامس الابتدائي",      address:"شيين - هى السلام - الاسماعيلية"},
  {id:77, motherName:"هنام صمصان صالح حسون",        phone:"01021989579", childName:"سخي محمد يوسف عياد",                 age:9,  grade:"الصف الرابع الابتدائي",      address:"شيين - هى السلام - الاسماعيلية"},
  {id:78, motherName:"عزة غريب على ابراهيم",        phone:"01272248169", childName:"محمد جمال راتمى محمد",                age:11, grade:"الصف الخامس الابتدائي",      address:"الشيخه سالمة - عين تمصين - الاسماعيلية"},
  {id:79, motherName:"فاطمة فهوى تسماح مسعود",     phone:"01080164366", childName:"ملك احمد حمدى عياد",                  age:16, grade:"الصف الثاني الثانوي",        address:"حمادة ابوتناصر - سرابيوم - مركز فايد"},
  {id:80, motherName:"فاطمة فهوى تسماح مسعود",     phone:"01080164366", childName:"خثن احمد حمدى عياد",                  age:13, grade:"الصف الثاني الثانوي",        address:"حمادة ابوتناصر - سرابيوم - مركز فايد"},
  {id:81, motherName:"فاطمة فهوى تسماح مسعود",     phone:"01080164366", childName:"نورة احمد حمدى عياد",                 age:9,  grade:"الصف الثالث الابتدائي",      address:"حمادة ابوتناصر - سرابيوم - مركز فايد"},
  {id:82, motherName:"خز صلاح حامد عبده",           phone:"01019364963", childName:"جنا سامح رجب على",                   age:12, grade:"الصف الأول الاعدادي",       address:"عين تمصين - الاسماعيلية"},
  {id:83, motherName:"شيماء مصطفى ابراهيم على",    phone:"01062005362", childName:"محمد السيد اسماعيل على",              age:15, grade:"الصف الثاني الاعدادي",       address:"الشيخ زايد - الاسماعيلية"},
  {id:84, motherName:"نجلاء زكريا عبدالحفيظ",       phone:"01040622517", childName:"روفان السيد اسماعيل على",             age:7,  grade:"الصف الأول الابتدائي",      address:"الشيخ زايد - الاسماعيلية"},
  {id:85, motherName:"نجلاء زكريا عبدالحفيظ",       phone:"01040622517", childName:"وفاء رمضان سمير محمد",               age:12, grade:"الصف الثاني الاعدادي",       address:"الشيخ زايد - الاسماعيلية"},
  {id:86, motherName:"هريدا المرتفي على الجبالي",   phone:"01040622517", childName:"جثى رمضان سمير محمد",                age:16, grade:"الثاني الصناعي",             address:"ش زطوط الجبل - سرابيوم - مركز فايد"},
  {id:87, motherName:"هريدا المرتفي على الجبالي",   phone:"01040622517", childName:"على رمضان سمير محمد",                age:14, grade:"الثاني الاعدادي",             address:"ش زطوط الجبل - سرابيوم - مركز فايد"},
  {id:88, motherName:"هيردا المرتغي على الجبالى",   phone:"01000471223", childName:"زينب طارق السيد محمود",              age:8,  grade:"الثالث الابتدائي",            address:"الثلاثيني - بجوار مسجد حسيب الله - الاسماعيلية"},
  {id:89, motherName:"سوليت محمد زكى عبدالمصطى",   phone:"01060637146", childName:"ساجد ابراهيم محمد احمد",             age:9,  grade:"الثلاث الابتدائي ازهر",       address:"الثلاثيني - بجوار مسجد حسيب الله - الاسماعيلية"},
  {id:90, motherName:"سوليت محمد زكى عبدالمصطى",   phone:"01060637146", childName:"ادم ابراهيم محمد احمد",              age:5,  grade:"طفل",                         address:"الثلاثيني - بجوار مسجد حسيب الله - الاسماعيلية"},
  {id:91, motherName:"سوليت محمد زكى عبدالمصطى",   phone:"01060637146", childName:"عبدالرحمن ابراهيم محمد احمد",       age:14, grade:"الصف الأول الاعدادي",       address:"الثلاثيني - بجوار مسجد حسيب الله - الاسماعيلية"},
  {id:92, motherName:"سوليت محمد زكى عبدالمصطى",   phone:"01060637146", childName:"اميمه ابراهيم محمد احمد",            age:13, grade:"الثاني الثانوي ازهر",        address:"الثلاثيني - بجوار مسجد حسيب الله - الاسماعيلية"},
  {id:93, motherName:"سوليت محمد زكى عبدالمصطى",   phone:"01060637146", childName:"طه على عبدالله",                     age:9,  grade:"الصف الثاني الثانوي",        address:"الثلاثيني - بجوار مسجد حسيب الله - الاسماعيلية"},
  {id:94, motherName:"منار السيد حامد السيد شرف",  phone:"01026219216", childName:"ليلى ابان عادل محمد",                age:2,  grade:"طفلة",                        address:"سرابيوم - مركز فايد - الاسماعيلية"},
  {id:95, motherName:"منار السيد حامد السيد شرف",  phone:"01026219216", childName:"حمزه رضا عادل محمد",                age:7,  grade:"الصف الأول الابتدائي",      address:"سرابيوم - مركز فايد - الاسماعيلية"},
  {id:96, motherName:"منار السيد حامد السيد شرف",  phone:"01026219216", childName:"نور عادل محمد",                      age:2,  grade:"طفلة",                        address:"سرابيوم - مركز فايد - الاسماعيلية"},
  {id:97, motherName:"هيام يوسف محمد عبدالرحمن",   phone:"01025048191", childName:"ملك محمد اسماعيل احمد",             age:14, grade:"الصف الثالث الاعدادي",       address:"سرابيوم - بجوار العقدة - مركز فايد"},
  {id:98, motherName:"هيام يوسف محمد عبدالرحمن",   phone:"01025048191", childName:"حمزة محمد اسماعيل احمد",            age:5,  grade:"الحضانة",                     address:"سرابيوم - بجوار العقدة - مركز فايد"},
  {id:99, motherName:"سحر سيد عطية الشوافى",        phone:"01090995363", childName:"لميس محمد القاضي احمد",             age:14, grade:"الثالث الاعدادي",             address:"العيادة - سرابيوم - مركز فايد"},
  {id:100,motherName:"مها محمود سيد طه ابراهيم",    phone:"01154197526", childName:"سامي محمد محمد ثابت",               age:13, grade:"الصف الأول الاعدادي",       address:"عزبة خنفق - عين تمصين - مركز الاسماعيلية"},
  {id:101,motherName:"مها محمود سيد طه ابراهيم",    phone:"01154197526", childName:"ثابت محمد ثابت حسن",               age:7,  grade:"الصف السادس الابتدائي",      address:"عزبة خنفق - عين تمصين - مركز الاسماعيلية"},
  {id:102,motherName:"مها محمود سيد طه ابراهيم",    phone:"01154197526", childName:"اسمه محمد ثابت حسن",               age:11, grade:"الصف السادس الابتدائي",      address:"عزبة خنفق - عين تمصين - مركز الاسماعيلية"},
  {id:103,motherName:"نجوى ابراهيم محمد حسين",      phone:"01097171265", childName:"فريده محمد عبدالرحمن احمد",        age:14, grade:"الصف الثالث الاعدادي",       address:"الخقليجات - سرابيوم - مركز فايد"},
  {id:104,motherName:"نجوى ابراهيم محمد حسين",      phone:"01097171265", childName:"امير محمد عبدالرحمن احمد",         age:2,  grade:"طفل",                         address:"الخقليجات - سرابيوم - مركز فايد"},
  {id:105,motherName:"نجوى ابراهيم محمد حسين",      phone:"01097171265", childName:"سيف محمد عبدالرحمن احمد",          age:14, grade:"الصف الثالث الاعدادي",       address:"الخقليجات - سرابيوم - مركز فايد"},
  {id:106,motherName:"اسراء سامي سليمان محمود",     phone:"01020833147", childName:"الام عبدالرحمن عوض عمر سالم",     age:5,  grade:"طفل",                         address:"الشيخة سالمة - عين تمصين - الاسماعيلية"},
  {id:107,motherName:"اسراء سامي سليمان محمود",     phone:"01020833147", childName:"مالك علاو عيد الجواد سالم",       age:1,  grade:"رضيع",                        address:"الشيخة سالمة - عين تمصين - الاسماعيلية"},
  {id:108,motherName:"ثرييا عيد موسى ابراهيم",       phone:"01050786679", childName:"محمد حسن حسين محمد",               age:3,  grade:"طفل",                         address:"عين تمصين - مركز الاسماعيلية"},
  {id:109,motherName:"ثرييا عيد موسى ابراهيم",       phone:"01050786679", childName:"ثريا راسن عبدالرحمن عياد",        age:5,  grade:"طفلة",                        address:"عين تمصين - مركز الاسماعيلية"},
  {id:110,motherName:"دينا عوض عمر سالم",           phone:"01016097037", childName:"مالك علاو عيد الجواد",             age:5,  grade:"طفل",                         address:"الشيخه سالمة - عين تمصين - الاسماعيلية"},
  {id:111,motherName:"دينا عوض عمر سالم",           phone:"01016097037", childName:"جودي على الجواد سالم",             age:13, grade:"الصف الثاني الثانوي",        address:"الشيخه سالمة - عين تمصين - الاسماعيلية"},
  {id:112,motherName:"دينا عوض عمر سالم",           phone:"01016097037", childName:"نور عوض عمر سالم",                 age:2,  grade:"طفلة",                        address:"الشيخه سالمة - عين تمصين - الاسماعيلية"},
];

async function migrate() {
  console.log('Starting migration...');

  // Group by mother
  const mothersMap = new Map();
  RAW_CHILDREN.forEach(c => {
    if (!mothersMap.has(c.phone)) {
      mothersMap.set(c.phone, {
        mother_name: c.motherName,
        phone: c.phone,
        address: c.address,
        children: []
      });
    }
    mothersMap.get(c.phone).children.push(c);
  });

  const mothers = Array.from(mothersMap.values());
  console.log(`Grouped into ${mothers.length} families.`);

  for (let i = 0; i < mothers.length; i++) {
    const m = mothers[i];
    
    // Manual check for existing family
    let { data: family, error: fetchError } = await supabase
      .from('families')
      .select('*')
      .eq('phone', m.phone)
      .maybeSingle();

    if (!family) {
      // Insert Family
      const { data: newFamily, error: fError } = await supabase
        .from('families')
        .insert({
          mother_name: m.mother_name,
          phone: m.phone,
          address: m.address,
          vulnerability_score: 0
        })
        .select()
        .single();

      if (fError) {
        console.error(`Error inserting family ${m.mother_name}:`, fError);
        continue;
      }
      family = newFamily;
      console.log(`Inserted Family: ${m.mother_name} (${family.sequential_id || 'N/A'})`);
    } else {
      console.log(`Family already exists: ${m.mother_name}`);
    }

    // Insert Children
    const childrenToInsert = m.children.map(c => ({
      family_id: family.id,
      child_name: c.childName, // FIX: Use child_name instead of name
      grade_level: c.grade
    }));

    // Check for existing children to avoid duplicates
    const { data: existingChildren } = await supabase
      .from('children')
      .select('child_name') // FIX: Use child_name instead of name
      .eq('family_id', family.id);
    
    const existingNames = new Set(existingChildren?.map(ec => ec.child_name) || []);
    const newChildren = childrenToInsert.filter(c => !existingNames.has(c.child_name));

    if (newChildren.length > 0) {
      const { error: cError } = await supabase
        .from('children')
        .insert(newChildren);

      if (cError) {
        console.error(`Error inserting children for ${m.mother_name}:`, cError);
      } else {
        console.log(`Inserted ${newChildren.length} children for ${m.mother_name}`);
      }
    } else {
      console.log(`No new children for ${m.mother_name}`);
    }
  }

  console.log('Migration finished!');
}

migrate();
