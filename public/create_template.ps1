$content = @'
full_name,last_seen_location,contact_info,date_of_detention,detention_facility,physical_description,age_at_detention,gender,status,additional_notes
الاسم الكامل (مطلوب),آخر مكان شوهد فيه (مطلوب),معلومات الاتصال (مطلوب),تاريخ الاعتقال (YYYY-MM-DD),مكان الاعتقال,الوصف الجسدي,العمر (0-120),الجنس (ذكر/أنثى/غير معروف),الحالة (معتقل/مفقود/محرر/متوفى/غير معروف),ملاحظات إضافية
'@

# Create UTF-8 with BOM encoding
$utf8WithBom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText("template.csv", $content, $utf8WithBom)
