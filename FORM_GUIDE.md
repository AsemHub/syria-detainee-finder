# دليل نموذج المعتقلين - Detainee Form Guide

هذا الدليل يوضح كيفية ملء نموذج المعتقلين بشكل صحيح.
This guide explains how to correctly fill out the detainee form.

## الحقول المطلوبة - Required Fields

### الاسم الكامل - Full Name
- **Required**: Yes
- **Type**: Text
- **Language**: Arabic
- **Example**: "محمد أحمد علي"
- **Validation**: يجب أن يحتوي على حروف عربية فقط

### الجنس - Gender
- **Required**: No
- **Type**: Selection
- **Valid Values**:
  - ذكر
  - أنثى
  - غير معروف

### العمر عند الاعتقال - Age at Detention
- **Required**: No
- **Type**: Number
- **Range**: 0-120
- **Example**: "35"
- **Validation**: رقم صحيح موجب أقل من 120

### تاريخ الاعتقال - Date of Detention
- **Required**: No
- **Type**: Date
- **Format**: YYYY-MM-DD
- **Example**: "2011-03-15"
- **Validation**: تاريخ بين 1900 والتاريخ الحالي

### الحالة - Status
- **Required**: No
- **Type**: Selection
- **Valid Values**:
  - معتقل
  - مفقود
  - محرر
  - متوفى
  - غير معروف

### آخر مكان شوهد فيه - Last Seen Location
- **Required**: No
- **Type**: Text
- **Language**: Arabic
- **Example**: "حي الميدان، دمشق"

### مركز الاحتجاز - Detention Facility
- **Required**: No
- **Type**: Text
- **Language**: Arabic
- **Example**: "سجن صيدنايا"

### الوصف الجسدي - Physical Description
- **Required**: No
- **Type**: Text
- **Language**: Arabic
- **Example**: "طويل القامة، عيون بنية"

### معلومات الاتصال - Contact Information
- **Required**: No
- **Type**: Text
- **Example**: "00963-XX-XXXXXXX"

### ملاحظات إضافية - Additional Notes
- **Required**: No
- **Type**: Text
- **Language**: Arabic

## ملاحظات مهمة - Important Notes

1. **اللغة - Language**
   - جميع النصوص يجب أن تكون باللغة العربية
   - القيم المحددة مسبقاً (مثل الجنس والحالة) يجب أن تكون بالعربية تماماً كما هي مذكورة

2. **التواريخ - Dates**
   - يجب أن تكون التواريخ بتنسيق YYYY-MM-DD
   - لا يمكن أن تكون التواريخ في المستقبل

3. **الأرقام - Numbers**
   - يجب أن يكون العمر رقماً صحيحاً موجباً
   - الحد الأقصى للعمر هو 120 سنة

4. **البيانات الحساسة - Sensitive Data**
   - تجنب إدخال معلومات شخصية حساسة في حقل الملاحظات
   - احرص على دقة المعلومات المدخلة

## البحث - Search

### معايير البحث - Search Criteria
- يمكن البحث باستخدام:
  - الاسم الكامل
  - الحالة (يجب اختيار القيمة العربية)
  - الجنس (يجب اختيار القيمة العربية)
  - العمر
  - الموقع
  - مركز الاحتجاز
  - التاريخ

### ملاحظات البحث - Search Notes
- البحث يدعم النص العربي بشكل كامل
- يمكن استخدام الفلاتر المتعددة معاً
- نتائج البحث مرتبة حسب الأهمية
- عند البحث باستخدام الحالة أو الجنس، تأكد من استخدام القيم العربية المحددة

## التحقق من صحة البيانات - Data Validation

1. **الاسم الكامل - Full Name**
   - يجب أن يحتوي على حروف عربية فقط
   - لا يقبل الأرقام أو الرموز الخاصة

2. **العمر - Age**
   - يجب أن يكون رقماً موجباً
   - يجب أن يكون أقل من 120

3. **التواريخ - Dates**
   - يجب أن تكون بعد 1900
   - لا يمكن أن تكون في المستقبل

4. **الحالة والجنس - Status and Gender**
   - يجب اختيار القيم العربية المحددة فقط
   - لا تقبل قيم أخرى
