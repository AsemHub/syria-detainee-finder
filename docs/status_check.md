SELECT enum_range(NULL::status_enum);
[
  {
    "enum_range": "{in_custody,missing,released,deceased,unknown,forcibly_disappeared}"
  }
]
SELECT COUNT(*) as total_records FROM detainees;
[
  {
    "total_records": 46
  }
]
-- Count records by status
SELECT status, COUNT(*) as count
FROM detainees
GROUP BY status
ORDER BY count DESC;

[
  {
    "status": "معتقل",
    "count": 15
  },
  {
    "status": "مفقود",
    "count": 10
  },
  {
    "status": "محرر",
    "count": 8
  },
  {
    "status": "متوفى",
    "count": 7
  },
  {
    "status": "غير معروف",
    "count": 6
  }
]
SELECT 
    id,
    full_name,
    status,
    last_seen_location,
    date_of_detention,
    created_at,
    last_update_date
FROM detainees
WHERE status = 'محرر'
ORDER BY created_at DESC;
[
  {
    "id": "af15a66d-bc40-4ddd-ac34-1cf466bee9fe",
    "full_name": "روي مومن",
    "status": "محرر",
    "last_seen_location": "اللاذقيه",
    "date_of_detention": "2022-01-25",
    "created_at": "2025-01-20 11:19:53.144732+00",
    "last_update_date": "2025-01-20 11:19:53.027+00"
  },
  {
    "id": "d6e93d25-6203-4e4d-bbd7-531af4d4ee01",
    "full_name": "محمود عبد الرحمن",
    "status": "محرر",
    "last_seen_location": "حمص  الخالديه",
    "date_of_detention": "2014-11-30",
    "created_at": "2025-01-20 11:19:27.426499+00",
    "last_update_date": "2025-01-20 11:19:27.308+00"
  },
  {
    "id": "5dd8f0ac-f66b-40f2-9e0e-94a2c1c7378f",
    "full_name": "غسان عادل الخضر",
    "status": "محرر",
    "last_seen_location": "حمص",
    "date_of_detention": "2014-11-25",
    "created_at": "2025-01-20 11:19:05.365916+00",
    "last_update_date": "2025-01-20 11:19:05.25+00"
  },
  {
    "id": "6a15b1f5-d2e0-42a6-9216-5ede7da31de0",
    "full_name": "دانا وليد الاحمد",
    "status": "محرر",
    "last_seen_location": "الرقه",
    "date_of_detention": "2015-08-22",
    "created_at": "2025-01-20 11:19:01.600047+00",
    "last_update_date": "2025-01-20 11:19:01.484+00"
  },
  {
    "id": "7e3b044a-b4b6-457b-9774-c3558e8eb323",
    "full_name": "عبد الله محمد الشيخ",
    "status": "محرر",
    "last_seen_location": "طرطوس",
    "date_of_detention": "2012-11-15",
    "created_at": "2025-01-20 11:18:57.805252+00",
    "last_update_date": "2025-01-20 11:18:57.687+00"
  },
  {
    "id": "e854c267-f80c-4575-9b03-c2b30ea48a95",
    "full_name": "نور حسين الشامي",
    "status": "محرر",
    "last_seen_location": "دمشق",
    "date_of_detention": "2016-02-20",
    "created_at": "2025-01-20 11:18:53.997076+00",
    "last_update_date": "2025-01-20 11:18:53.884+00"
  },
  {
    "id": "3838f467-9998-4fee-afc6-50513a847ea6",
    "full_name": "خالد عبد الرحمن السيد",
    "status": "محرر",
    "last_seen_location": "حمص",
    "date_of_detention": "2011-09-10",
    "created_at": "2025-01-20 11:18:48.886252+00",
    "last_update_date": "2025-01-20 11:18:48.444+00"
  },
  {
    "id": "5e3c14ad-2506-4d10-a44e-248c1f01b474",
    "full_name": "سمير سبسب",
    "status": "محرر",
    "last_seen_location": "حلب",
    "date_of_detention": "2017-05-02",
    "created_at": "2025-01-20 07:03:05.547627+00",
    "last_update_date": "2025-01-20 10:00:00.046+00"
  }
]
SELECT definition 
FROM pg_matviews 
WHERE matviewname = 'mv_detainees_search';
[
  {
    "definition": " SELECT d.id,\n    d.full_name,\n    d.original_name,\n    d.date_of_detention,\n    d.last_seen_location,\n    d.detention_facility,\n    d.physical_description,\n    d.age_at_detention,\n    d.gender,\n    d.status,\n    d.contact_info,\n    d.additional_notes,\n    d.created_at,\n    d.last_update_date,\n    d.source_organization,\n    d.normalized_name,\n    d.effective_date,\n    d.gender_terms,\n    d.name_fts,\n    d.location_fts,\n    d.description_fts,\n    d.contact_fts,\n    d.search_vector,\n    d.update_history,\n    d.last_update_by,\n    d.last_update_reason,\n    d.metadata\n   FROM detainees d;"
  }
]