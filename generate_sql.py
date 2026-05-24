import re
import uuid
import datetime

# Grade to school_stage mapping
GRADE_MAPPING = {
    'الصف الاول الاعدادى': 'preparatory',
    'الصف الثانى الثانوى': 'secondary',
    'الصف الثالث الثانوى': 'secondary',
    'الصف الثانى الاعدادى': 'preparatory',
    'الصف السادس الابتدائى': 'primary',
    'الصف الخامس الابتدائى': 'primary',
    'الصف الثانى الابتدائى': 'primary',
    'الصف الثالث الاعدادى': 'preparatory',
    'الصف الاول الثانوى': 'secondary',
    'الصف الرابع الابتدائى': 'primary',
    'الصف الثالث الابتدائى': 'primary',
    'الثالث الإبتدائي أزهر': 'primary',
    'السادس الإبتدائي': 'primary',
    'الثالث الزراعي': 'secondary',
    'الثاني الإعدادي': 'preparatory',
    'الثانى الثانوى ازهر': 'secondary',
    'الثانى الاعدادي ازهر': 'preparatory',
    'الصف الأول الابتدائى': 'primary',
    'الثانى الصناعي': 'secondary',
    'التاسع': 'preparatory',
    'الثالث الابتدائي': 'primary',
    'الحضانه': 'preschool',
    'طفلة': 'preschool',
    'طفل': 'preschool',
}

GOVERNORATES = {
    '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بور سعيد', '04': 'السويس',
    '11': 'دمياط', '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية',
    '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة',
    '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم',
    '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا', '28': 'أسوان',
    '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد', '33': 'مطروح',
    '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج الجمهورية',
}

def parse_nid(nid):
    if not nid or len(nid) != 14 or not nid.isdigit():
        return None
    
    century_code = nid[0]
    year = int(nid[1:3])
    month = int(nid[3:5])
    day = int(nid[5:7])
    gov_code = nid[7:9]
    gender_digit = int(nid[12])

    if century_code == '2':
        full_year = 1900 + year
    elif century_code == '3':
        full_year = 2000 + year
    else:
        return None
    
    try:
        if month < 1 or month > 12 or day < 1 or day > 31: return None
        dob = datetime.date(full_year, month, day)
    except ValueError:
        return None
        
    now = datetime.date.today()
    age = now.year - full_year - ((now.month, now.day) < (month, day))
    gender = 'M' if gender_digit % 2 != 0 else 'F'
    governorate = GOVERNORATES.get(gov_code, 'غير محدد')
    
    return {
        'dob': dob.isoformat(),
        'age': age,
        'gender': gender,
        'governorate': governorate,
        'gov_code': gov_code
    }

def clean_nid(nid):
    if not nid: return None
    nid = nid.strip().replace(" ", "")
    # Remove scientific notation artifacts if possible
    if 'E+' in nid.upper():
        # Only keep if it looks like a full 14 digit (unlikely to be accurate though)
        return nid
    return nid

lines = open('data.txt', 'r', encoding='utf-8').readlines()

families = []
nid_map = {} # nid -> family object
name_phone_map = {} # (name, phone) -> family object

for line in lines:
    parts = [p.strip() for p in line.split('\t')]
    if len(parts) < 9: continue
    
    m_name = parts[1]
    m_phone = parts[2]
    c_name = parts[3]
    c_nid = clean_nid(parts[4])
    c_age_val = parts[5]
    c_grade = parts[6]
    m_nid = clean_nid(parts[7])
    m_address = parts[8]

    # Deduplication logic
    target_family = None
    
    # 1. Try to match by NID (if valid)
    is_m_nid_valid = m_nid and len(m_nid) == 14 and m_nid.isdigit()
    if is_m_nid_valid:
        target_family = nid_map.get(m_nid)
    
    # 2. Try to match by Name + Phone
    if not target_family:
        target_family = name_phone_map.get((m_name, m_phone))
        # If found by Name+Phone BUT now we have a valid NID, link them
        if target_family and is_m_nid_valid:
            nid_map[m_nid] = target_family
            if not target_family['nid']:
                target_family['nid'] = m_nid
    
    # 3. Create new family if not found
    if not target_family:
        target_family = {
            'id': str(uuid.uuid4()),
            'name': m_name,
            'phone': m_phone,
            'nid': m_nid if is_m_nid_valid else None,
            'address': m_address,
            'children': []
        }
        # Parse mother NID if valid
        if is_m_nid_valid:
            parsed = parse_nid(m_nid)
            if parsed:
                target_family.update(parsed)
            nid_map[m_nid] = target_family
        
        name_phone_map[(m_name, m_phone)] = target_family
        families.append(target_family)
    
    # Add child
    c_nid_valid = c_nid and len(c_nid) == 14 and c_nid.isdigit()
    grade = c_grade.strip()
    stage = GRADE_MAPPING.get(grade, 'not_in_school')
    
    child = {
        'name': c_name,
        'nid': c_nid if c_nid_valid else None,
        'grade': grade,
        'stage': stage,
        'age': c_age_val if c_age_val else None
    }
    
    if c_nid_valid:
        parsed_c = parse_nid(c_nid)
        if parsed_c:
            child['dob'] = parsed_c['dob']
            child['gender'] = parsed_c['gender']
            if not child['age']:
                child['age'] = parsed_c['age']
    
    target_family['children'].append(child)

# Generate SQL
sql = []
sql.append("BEGIN;")
sql.append("TRUNCATE public.transactions, public.case_assignments, public.case_history, public.case_locks, public.children, public.families CASCADE;")
sql.append("ALTER SEQUENCE IF exists family_seq RESTART WITH 1;")
sql.append("")

for f in families:
    f_name = f['name'].replace("'", "''")
    f_phone = f['phone'].replace("'", "''")
    f_nid = f"'{f['nid']}'" if f['nid'] else "NULL"
    f_address = f['address'].replace("'", "''")
    f_dob = f"'{f['dob']}'" if 'dob' in f else "NULL"
    f_age = f.get('age', "NULL")
    f_gender = f"'{f['gender']}'" if 'gender' in f else "NULL"
    f_gov = f"'{f['governorate']}'" if 'governorate' in f else "NULL"
    
    sql.append(f"INSERT INTO public.families (id, mother_name, phone, national_id, address, date_of_birth, age, gender, governorate, status) VALUES ('{f['id']}', '{f_name}', '{f_phone}', {f_nid}, '{f_address}', {f_dob}, {f_age}, {f_gender}, {f_gov}, 'active');")
    
    for c in f['children']:
        c_name = c['name'].replace("'", "''")
        c_nid = f"'{c['nid']}'" if c['nid'] else "NULL"
        c_grade = c['grade'].replace("'", "''")
        c_stage = c['stage']
        c_dob = f"'{c['dob']}'" if 'dob' in c else "NULL"
        c_age = c['age'] if c['age'] else "NULL"
        c_gender = f"'{c['gender']}'" if 'gender' in c else "NULL"
        
        sql.append(f"  INSERT INTO public.children (family_id, child_name, national_id, date_of_birth, age, gender, grade_level, school_stage) VALUES ('{f['id']}', '{c_name}', {c_nid}, {c_dob}, {c_age}, {c_gender}, '{c_grade}', '{c_stage}');")
    
    sql.append("")

sql.append("COMMIT;")

with open('data_import.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql))

print(f"SQL generated successfully in data_import.sql. Found {len(families)} unique families.")
