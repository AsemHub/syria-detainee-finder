# Contributing to Syrian Detainee Finder | المساهمة في الباحث عن المعتقلين

First off, thank you for considering contributing to Syrian Detainee Finder. This is a humanitarian project that aims to help families locate and gather information about their detained loved ones. Your help makes a difference.

شكراً لتفكيرك في المساهمة في مشروع الباحث عن المعتقلين. هذا مشروع إنساني يهدف إلى مساعدة العائلات في العثور على أحبائهم المعتقلين وجمع المعلومات عنهم. مساعدتك تصنع فرقاً.

## Code of Conduct | مدونة السلوك

By participating in this project, you agree to maintain a respectful and empathetic environment. Remember that this project deals with sensitive humanitarian issues affecting real people and families.

بمشاركتك في هذا المشروع، فإنك توافق على الحفاظ على بيئة محترمة ومتعاطفة. تذكر أن هذا المشروع يتعامل مع قضايا إنسانية حساسة تؤثر على أشخاص وعائلات حقيقية.

## How Can I Contribute? | كيف يمكنني المساهمة؟

### Reporting Issues 🐛 | الإبلاغ عن المشاكل

- Use the GitHub issue tracker | استخدم متتبع المشاكل في GitHub
- Check if the issue already exists | تحقق مما إذا كانت المشكلة موجودة بالفعل
- Include as much detail as possible | قم بتضمين أكبر قدر ممكن من التفاصيل:
  - Steps to reproduce | خطوات إعادة إنتاج المشكلة
  - Expected behavior | السلوك المتوقع
  - Actual behavior | السلوك الفعلي
  - Screenshots if applicable | لقطات الشاشة إن أمكن
  - Browser/device information | معلومات المتصفح/الجهاز

### Suggesting Enhancements 💡 | اقتراح التحسينات

- First, check if a similar enhancement has been suggested | تحقق أولاً مما إذا كان قد تم اقتراح تحسين مماثل
- Clearly describe the enhancement and its benefits | صف التحسين وفوائده بوضوح
- Consider both Arabic and English-speaking users | ضع في اعتبارك المستخدمين الناطقين بالعربية والإنجليزية
- Think about accessibility and ease of use | فكر في سهولة الوصول والاستخدام

### Code Contributions 💻 | المساهمات البرمجية

1. Fork the repository | انسخ المستودع
2. Create a new branch | أنشئ فرعاً جديداً (`git checkout -b feature/your-feature`)
3. Make your changes | قم بإجراء تغييراتك
4. Run tests | قم بتشغيل الاختبارات: `npm test`
5. Run linting | قم بتشغيل التدقيق: `npm run lint`
6. Commit your changes | احفظ تغييراتك (`git commit -am 'Add new feature'`)
7. Push to the branch | ادفع إلى الفرع (`git push origin feature/your-feature`)
8. Create a Pull Request | أنشئ طلب سحب

#### Development Setup | إعداد بيئة التطوير

```bash
# Clone your fork | انسخ النسخة الخاصة بك
git clone https://github.com/YOUR_USERNAME/syria-detainee-finder.git

# Install dependencies | تثبيت المتطلبات
npm install

# Set up environment variables | إعداد متغيرات البيئة
cp .env.example .env.local

# Start development server | تشغيل خادم التطوير
npm run dev
```

### Translation Help 🌐 | المساعدة في الترجمة

We prioritize Arabic language support. Help us improve | نعطي الأولوية لدعم اللغة العربية. ساعدنا في تحسين:
- UI translations | ترجمات واجهة المستخدم
- Documentation translations | ترجمات التوثيق
- Error messages | رسائل الخطأ
- Form validations | التحقق من صحة النماذج

### Documentation 📝 | التوثيق

- Help improve our documentation | ساعد في تحسين توثيقنا
- Add Arabic translations where missing | أضف الترجمات العربية حيث تكون مفقودة
- Update guides and tutorials | قم بتحديث الأدلة والدروس
- Add code comments | أضف تعليقات للكود

## Style Guidelines | إرشادات النمط

### Code Style | نمط الكود

- Use TypeScript for type safety | استخدم TypeScript للسلامة النوعية
- Follow the existing code style | اتبع نمط الكود الحالي
- Use meaningful variable and function names | استخدم أسماء ذات معنى للمتغيرات والدوال
- Add comments for complex logic | أضف تعليقات للمنطق المعقد
- Include both Arabic and English comments where relevant | أضف تعليقات بالعربية والإنجليزية حيث يكون ذلك مناسباً

### Commit Messages | رسائل الالتزام

Format | الصيغة: `type(scope): description`

Types | الأنواع:
- `feat`: New feature | ميزة جديدة
- `fix`: Bug fix | إصلاح خطأ
- `docs`: Documentation | توثيق
- `style`: Formatting | تنسيق
- `refactor`: Code restructuring | إعادة هيكلة الكود
- `test`: Adding tests | إضافة اختبارات
- `chore`: Maintenance | صيانة

Example | مثال: `feat(search): add advanced filtering options`

### Pull Request Process | عملية طلب السحب

1. Update documentation if needed | قم بتحديث التوثيق إذا لزم الأمر
2. Add tests for new features | أضف اختبارات للميزات الجديدة
3. Ensure all tests pass | تأكد من نجاح جميع الاختبارات
4. Update the README.md if needed | قم بتحديث README.md إذا لزم الأمر
5. Request review from maintainers | اطلب المراجعة من المشرفين

## Questions? | أسئلة؟

Feel free to create an issue with your question or reach out to the maintainers.

لا تتردد في إنشاء مشكلة مع سؤالك أو التواصل مع المشرفين.

---

<div dir="rtl">

## ملاحظات إضافية للمساهمين الناطقين بالعربية

### أهمية دقة الترجمة
- تأكد من أن الترجمات دقيقة وتحافظ على المعنى الأصلي
- استخدم مصطلحات تقنية متعارف عليها في المجتمع العربي
- حافظ على اتساق المصطلحات في جميع أنحاء المشروع

### اعتبارات خاصة
- راعِ الحساسية الثقافية في التعامل مع موضوع المعتقلين
- تجنب استخدام مصطلحات قد تكون مسيئة أو غير مناسبة
- احرص على الوضوح والبساطة في الشرح

### المساعدة في التوثيق
- ساهم في ترجمة الوثائق التقنية إلى العربية
- أضف شروحات وأمثلة تناسب المستخدم العربي
- ساعد في تحسين تجربة المستخدم للناطقين بالعربية

</div>
