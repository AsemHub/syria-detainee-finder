# الباحث عن المعتقلين | Syrian Detainee Finder

<div align="center">

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](CONTRIBUTING.md)

[🇸🇾 عربي](#عربي) | [🌐 English](#english)

</div>

---

<div dir="rtl">

## عربي

منصة إنسانية مخصصة للمساعدة في العثور أو الحصول على معلومات عن المعتقلين السوريين المفقودين في محاولة للم شمل العائلات.

[انتقل إلى التوثيق العربي الكامل ▶](#المميزات)

## ✨ المميزات

- 🌐 **واجهة عربية**
  - دعم كامل للغة العربية
  - واجهة مستخدم معربة
  - تصفح سهل وبديهي

- 📝 **تقديم المعلومات**
  - نماذج سهلة الاستخدام
  - جمع بيانات مفصلة
  - تتبع معلومات الاتصال

- 📊 **أدوات للمنظمات**
  - رفع ملفات CSV
  - التحقق من صحة البيانات
  - كشف التكرارات

- 🎨 **تصميم عصري**
  - تصميم متجاوب
  - الوضع الليلي/النهاري
  - مكونات سهلة الوصول

## 🚀 البدء

### المتطلبات المسبقة

- Node.js (v18+)
- npm or yarn
- Supabase account

### التثبيت

1. نسخ المستودع
```bash
git clone https://github.com/AsemHub/syria-detainee-finder.git
```

2. تثبيت المتطلبات
```bash
npm install
# or
yarn install
```

3. إعداد متغيرات البيئة
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. تشغيل خادم التطوير
```bash
npm run dev
# or
yarn dev
```

### إعداد قاعدة البيانات

1. إنشاء مشروع Supabase جديد

2. تشغيل ملفات SQL بالترتيب:
   - تشغيل `01_initial_setup.sql` أولاً
   - ثم تشغيل `02_search_and_functions.sql`

   هذه الملفات ستقوم بإعداد:
   - هيكل قاعدة البيانات
   - دوال البحث
   - تطبيع النص العربي
   - الفهارس والصلاحيات

3. الحصول على بيانات اعتماد Supabase:
   - رابط المشروع
   - مفتاح الوصول المجهول

4. تحديث متغيرات البيئة:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ تم البناء باستخدام

- [Next.js 14](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

## 📖 الاستخدام

### للأفراد
1. زيارة صفحة "تقديم معلومات"
2. ملء النموذج
3. تقديم معلومات الاتصال

### للمنظمات
1. الذهاب إلى صفحة "رفع ملف"
2. تحميل نموذج CSV
3. رفع الملف المكتمل

## 🤝 المساهمة

المساهمات مرحب بها! لا تتردد في تقديم طلب سحب.

## 📄 الرخصة

هذا المشروع مرخص تحت رخصة MIT.

## 📞 التواصل

رابط المشروع: [https://github.com/AsemHub/syria-detainee-finder](https://github.com/AsemHub/syria-detainee-finder)

## 🙏 شكر وتقدير

- المساهمون والقائمون على الصيانة
- المنظمات التي تستخدم المنصة
- المجتمع السوري للدعم والملاحظات

## 🔒 الأمان

- التشفير من طرف إلى طرف للبيانات الحساسة
- تدقيق أمني دوري
- نسخ احتياطي واسترجاع البيانات
- متوافق مع معايير حماية البيانات

## 🚀 النشر

التطبيق منشور على Vercel مع Supabase كخادم خلفي:

```bash
# البناء للإنتاج
npm run build

# النشر على Vercel
vercel --prod
```

## 📊 هيكل المشروع

```
syria-detainee-finder/
├── src/                    # ملفات المصدر
│   ├── app/               # موجه التطبيق Next.js
│   ├── components/        # مكونات React
│   ├── lib/              # دوال مساعدة
│   └── styles/           # أنماط CSS
├── public/               # ملفات ثابتة
├── docs/                # التوثيق
├── supabase/            # ترحيلات قاعدة البيانات
└── test/                # ملفات الاختبار
```

## ⚡ الأداء

- عرض من جانب الخادم للتحميل السريع
- استعلامات قاعدة بيانات محسنة
- بحث فعال للنص العربي
- تصميم متجاوب لجميع الأجهزة


## 💝 دعم المشروع

مساعدتك تساهم في تطوير وتحسين هذه المنصة الإنسانية:

- ضع نجمة للمستودع
- شارك مع المنظمات المعنية
- [ساهم](CONTRIBUTING.md) في تطوير الكود
- قدم ملاحظات واقتراحات

</div>

---

## English

A humanitarian platform dedicated to helping locate and gather information about Syrian detainees, aiming to reunite families.

> **🔒 IMPORTANT: Data Privacy & Security**  
> All submitted information is encrypted and handled with strict privacy measures. We prioritize the security and confidentiality of all submitted data.

## 🌟 Project Status

- **Current Version**: 0.1.0
- **Stage**: Beta Testing
- **Last Update**: January 2024
- **Deployment**: [Live Demo](https://syria-detainee-finder.vercel.app)

## ✨ Features

- 🌐 **Arabic-First Interface**
  - Full RTL support
  - Localized UI components
  - Intuitive navigation

- 📝 **Information Submission**
  - User-friendly forms
  - Detailed data collection
  - Contact information tracking

- 📊 **Organization Tools**
  - Bulk CSV upload
  - Data validation
  - Duplicate detection

- 🎨 **Modern Design**
  - Responsive layout
  - Dark/Light modes
  - Accessible components

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/AsemHub/syria-detainee-finder.git
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

### Database Setup

1. Create a new Supabase project

2. Run the SQL setup files in order:
   - Run `01_initial_setup.sql` first
   - Then run `02_search_and_functions.sql`

   These files will set up:
   - Database schema
   - Search functions
   - Arabic text normalization
   - Indexes and permissions

3. Get your Supabase credentials:
   - Project URL
   - Anon Key

4. Update environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ Built With

- [Next.js 14](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

## 📖 Usage

### For Individuals
1. Visit "Submit Information"
2. Fill out the form
3. Provide contact details

### For Organizations
1. Go to "Upload File"
2. Download CSV template
3. Upload completed file

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 📞 Contact

Project Link: [https://github.com/AsemHub/syria-detainee-finder](https://github.com/AsemHub/syria-detainee-finder)

## 🙏 Acknowledgments

- Contributors and maintainers
- Organizations using the platform
- Syrian community for support and feedback

## 🔒 Security

- End-to-end encryption for sensitive data | تشفير طرف-لطرف للبيانات الحساسة
- Regular security audits | تدقيق أمني دوري
- Data backup and recovery | نسخ احتياطي واسترجاع البيانات
- GDPR compliant | متوافق مع معايير حماية البيانات

## 🚀 Deployment

The application is deployed on Vercel with Supabase as the backend:

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

## 📊 Project Structure

```
syria-detainee-finder/
├── src/                    # Source files
│   ├── app/               # Next.js app router
│   ├── components/        # React components
│   ├── lib/              # Utility functions
│   └── styles/           # CSS styles
├── public/               # Static files
├── docs/                # Documentation
├── supabase/            # Database migrations
└── test/                # Test files
```

## ⚡ Performance

- Server-side rendering for fast initial load | عرض من جانب الخادم للتحميل السريع
- Optimized database queries | استعلامات قاعدة بيانات محسنة
- Efficient Arabic text search | بحث فعال للنص العربي
- Responsive design for all devices | تصميم متجاوب لجميع الأجهزة


## 💝 Support the Project

Your support helps us maintain and improve this humanitarian platform:

- Star the repository | ضع نجمة للمستودع
- Share with relevant organizations | شارك مع المنظمات المعنية
- [Contribute](CONTRIBUTING.md) to the codebase | ساهم في تطوير الكود
- Provide feedback and suggestions | قدم ملاحظات واقتراحات

---

<div align="center">

**Together we can help reunite Syrian families | معاً نستطيع المساعدة في لم شمل العائلات السورية**

</div>
