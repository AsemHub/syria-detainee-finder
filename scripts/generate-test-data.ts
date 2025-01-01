import { DetaineeGender, DetaineeStatus } from '@/lib/database.types';

interface TestDetainee {
  full_name: string;
  date_of_detention: string | null;
  last_seen_location: string;
  detention_facility: string | null;
  physical_description: string | null;
  age_at_detention: number | null;
  gender: DetaineeGender;
  status: DetaineeStatus;
  additional_info: string | null;
}

const syrianCities = [
  'Damascus',
  'Aleppo',
  'Homs',
  'Latakia',
  'Hama',
  'Deir ez-Zor',
  'Raqqa',
  'Idlib',
  'Daraa',
  'Tartus'
];

const detentionFacilities = [
  'Sednaya Military Prison',
  'Adra Central Prison',
  'Branch 215',
  'Branch 235 (Palestine Branch)',
  'Branch 248',
  'Branch 251 (Al Khatib Branch)',
  'Mezzeh Military Prison',
  null
];

const physicalDescriptions = [
  'Tall with dark hair and brown eyes',
  'Medium height, light skin, and black hair',
  'Short stature with distinctive facial scar',
  'Athletic build with a beard',
  'Wears glasses, has gray hair',
  null
];

const additionalInfos = [
  'Last seen at a checkpoint',
  'Was arrested during a peaceful protest',
  'Taken from workplace',
  'Disappeared after visiting relatives',
  'Arrested during a raid on the neighborhood',
  null
];

const arabicFirstNames = [
  'محمد',
  'أحمد',
  'علي',
  'حسن',
  'خالد',
  'عمر',
  'فاطمة',
  'زينب',
  'مريم',
  'سارة',
  'ليلى',
  'نور'
];

const arabicLastNames = [
  'الأحمد',
  'السيد',
  'العلي',
  'المحمد',
  'الحسن',
  'الخالد',
  'العمري',
  'الزين',
  'المصري',
  'الحموي'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function generateTestDetainee(): TestDetainee {
  const firstName = getRandomElement(arabicFirstNames);
  const lastName = getRandomElement(arabicLastNames);
  const fullName = `${firstName} ${lastName}`;
  
  const startDate = new Date('2011-03-15'); // Start of Syrian conflict
  const endDate = new Date('2024-12-17'); // Current date
  
  return {
    full_name: fullName,
    date_of_detention: Math.random() > 0.2 ? generateRandomDate(startDate, endDate) : null,
    last_seen_location: getRandomElement(syrianCities),
    detention_facility: getRandomElement(detentionFacilities),
    physical_description: getRandomElement(physicalDescriptions),
    age_at_detention: Math.random() > 0.1 ? Math.floor(Math.random() * 50) + 15 : null, // Ages 15-65
    gender: getRandomElement(['ذكر', 'أنثى' , 'غير معروف'] as DetaineeGender[]),
    status: getRandomElement(['معتقل', 'مفقود', 'مطلق سراح', 'متوفى', 'غير معروف'] as DetaineeStatus[]),
    additional_info: getRandomElement(additionalInfos)
  };
}

// Generate 10 sample detainees
const sampleDetainees = Array.from({ length: 10 }, () => generateTestDetainee());

// Print the sample data in a formatted way
console.log('Sample Detainee Data for Testing:');
console.log(JSON.stringify(sampleDetainees, null, 2));
