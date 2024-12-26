# الباحث عن المعتقلين | Syrian Detainee Finder

منصة إنسانية مخصصة للمساعدة في العثور أو الحصول على معلومات عن المعتقلين السوريين المفقودين في محاولة للم شمل العائلات.

A humanitarian platform dedicated to helping locate and gather information about Syrian detainees, aiming to reunite families.

## ✨ Features | المميزات

- 🌐 **Arabic-First Interface | واجهة عربية**
  - Full RTL support | دعم كامل للغة العربية
  - Localized UI components | واجهة مستخدم معربة
  - Intuitive navigation | تصفح سهل وبديهي

- 📝 **Information Submission | تقديم المعلومات**
  - User-friendly forms | نماذج سهلة الاستخدام
  - Detailed data collection | جمع بيانات مفصلة
  - Contact information tracking | تتبع معلومات الاتصال

- 📊 **Organization Tools | أدوات للمنظمات**
  - Bulk CSV upload | رفع ملفات CSV
  - Data validation | التحقق من صحة البيانات
  - Duplicate detection | كشف التكرارات

- 🎨 **Modern Design | تصميم عصري**
  - Responsive layout | تصميم متجاوب
  - Dark/Light modes | الوضع الليلي/النهاري
  - Accessible components | مكونات سهلة الوصول

## 🚀 Getting Started | البدء

### Prerequisites | المتطلبات المسبقة

- Node.js (v18+)
- npm or yarn
- Supabase account

### Installation | التثبيت

1. Clone the repository | نسخ المستودع
```bash
git clone https://github.com/AsemHub/syria-detainee-finder.git
```

2. Install dependencies | تثبيت المتطلبات
```bash
npm install
# or
yarn install
```

3. Set up environment variables | إعداد متغيرات البيئة
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server | تشغيل خادم التطوير
```bash
npm run dev
# or
yarn dev
```

### Database Setup | إعداد قاعدة البيانات

1. Create a new Supabase project | إنشاء مشروع Supabase جديد

2. Run the SQL setup files in order | تشغيل ملفات SQL بالترتيب:
   - Run `01_initial_setup.sql` first | تشغيل `01_initial_setup.sql` أولاً
   - Then run `02_search_and_functions.sql` | ثم تشغيل `02_search_and_functions.sql`

   These files will set up: | هذه الملفات ستقوم بإعداد:
   - Database schema | هيكل قاعدة البيانات
   - Search functions | دوال البحث
   - Arabic text normalization | تطبيع النص العربي
   - Indexes and permissions | الفهارس والصلاحيات

3. Get your Supabase credentials | الحصول على بيانات اعتماد Supabase:
   - Project URL | رابط المشروع
   - Anon Key | مفتاح الوصول المجهول

4. Update environment variables | تحديث متغيرات البيئة:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ Built With | تم البناء باستخدام

- [Next.js 14](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

## 📖 Usage | الاستخدام

### For Individuals | للأفراد
1. Visit "Submit Information" | زيارة صفحة "تقديم معلومات"
2. Fill out the form | ملء النموذج
3. Provide contact details | تقديم معلومات الاتصال

### For Organizations | للمنظمات
1. Go to "Upload File" | الذهاب إلى صفحة "رفع ملف"
2. Download CSV template | تحميل نموذج CSV
3. Upload completed file | رفع الملف المكتمل

## 🤝 Contributing | المساهمة

Contributions are welcome! Please feel free to submit a Pull Request.

المساهمات مرحب بها! لا تتردد في تقديم طلب سحب.

## 📄 License | الرخصة

This project is licensed under the MIT License.

هذا المشروع مرخص تحت رخصة MIT.

## 📞 Contact | التواصل

Project Link | رابط المشروع: [https://github.com/AsemHub/syria-detainee-finder](https://github.com/AsemHub/syria-detainee-finder)

## 🙏 Acknowledgments | شكر وتقدير

- Contributors and maintainers | المساهمون والقائمون على الصيانة
- Organizations using the platform | المنظمات التي تستخدم المنصة
- Syrian community for support and feedback | المجتمع السوري للدعم والملاحظات
