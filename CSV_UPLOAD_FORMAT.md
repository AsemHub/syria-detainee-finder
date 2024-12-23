# CSV Upload Format Requirements

## Required Columns
1. `full_name` (Text, Required)
   - Full name of the detainee
   - Cannot be empty

2. `last_seen_location` (Text, Required)
   - Location where the person was last seen
   - Cannot be empty

3. `contact_info` (Text, Required)
   - Contact information
   - Cannot be empty

## Optional Columns
4. `date_of_detention` (Date, Optional)
   - Format: YYYY-MM-DD
   - Example: 2023-12-25

5. `detention_facility` (Text, Optional)
   - Name of the detention facility if known

6. `physical_description` (Text, Optional)
   - Physical description of the detainee

7. `age_at_detention` (Integer, Optional)
   - Age when detained
   - Must be a number

8. `gender` (Enum, Optional, defaults to 'unknown')
   Valid values:
   - male / ذكر
   - female / أنثى
   - unknown / غير محدد

9. `status` (Enum, Optional, defaults to 'unknown')
   Valid values:
   - in_custody / معتقل
   - missing / مفقود
   - released / محرر
   - deceased / متوفى
   - unknown / غير معروف

10. `additional_notes` (Text, Optional)
    - Any additional information

11. `organization` (Text, Optional)
    - Organization submitting the record

## Example CSV
```csv
full_name,date_of_detention,last_seen_location,detention_facility,physical_description,age_at_detention,gender,status,contact_info,additional_notes,organization
"أحمد محمد علي","2023-12-01","حلب","سجن حلب المركزي","طويل القامة، شعر أسود",35,"ذكر","معتقل","0123456789","تم اعتقاله من منزله","منظمة حقوق الإنسان"
```

## Important Notes

1. Column names must be exactly as shown above in English
   يجب أن تكون أسماء الأعمدة باللغة الإنجليزية تماماً كما هو موضح أعلاه

2. Values can be in Arabic or English
   يمكن أن تكون القيم باللغة العربية أو الإنجليزية

3. Dates must be in YYYY-MM-DD format
   التواريخ يجب أن تكون بتنسيق YYYY-MM-DD

4. Ages must be whole numbers
   الأعمار يجب أن تكون أرقاماً صحيحة