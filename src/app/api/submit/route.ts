import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase.server"
import { z } from "zod"
import { Database } from "@/lib/database.types"
import { normalizeNameForDb, validateGender, validateStatus } from "@/lib/validation"
import Logger from "@/lib/logger"
import { DetaineeGender, DetaineeStatus } from "@/lib/database.types"

// In-memory store for rate limiting
const submissionTimes = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
const MAX_SUBMISSIONS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const submissions = submissionTimes.get(ip) || [];
  
  // Remove old submissions
  const recentSubmissions = submissions.filter(time => now - time < RATE_LIMIT_WINDOW);
  submissionTimes.set(ip, recentSubmissions);
  
  return recentSubmissions.length >= MAX_SUBMISSIONS_PER_WINDOW;
}

type DetaineeInsert = Database['public']['Tables']['detainees']['Insert']

const submitSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[\p{L}\s'-]+$/u, "Name can only contain letters, spaces, hyphens and apostrophes"),
  date_of_detention: z.string()
    .refine(val => !val || !isNaN(Date.parse(val)), "Invalid date format")
    .nullable()
    .optional(),
  last_seen_location: z.string().min(2, "Location must be at least 2 characters")
    .max(200, "Location must be less than 200 characters"),
  detention_facility: z.string()
    .max(200, "Facility name must be less than 200 characters")
    .nullable()
    .optional(),
  physical_description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .nullable()
    .optional(),
  age_at_detention: z.union([
    z.number()
      .min(0, "Age must be between 0 and 120")
      .max(120, "Age must be between 0 and 120"),
    z.string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 120, "Age must be between 0 and 120")
      .transform(val => val == null || val === undefined ? null : Number(val))
  ])
    .nullable()
    .optional(),
  status: z.enum(["معتقل", "مفقود", "مطلق سراح", "متوفى", "مغيب قسراً", "غير معروف"] as const),
  gender: z.enum(["ذكر", "أنثى", "غير معروف"] as const),
  contact_info: z.string()
    .min(2, "Contact info must be at least 2 characters")
    .max(200, "Contact info must be less than 200 characters"),
  additional_notes: z.string()
    .max(1000, "Additional notes must be less than 1000 characters")
    .nullable()
    .optional(),
  // Add new fields for handling duplicates
  known_similar_records: z.array(z.string()).optional(),
  is_intentional_duplicate: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    // Verify Supabase connection
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      Logger.error('Missing Supabase environment variables:', {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "عدد كبير من المحاولات. يرجى المحاولة لاحقاً." },
        { status: 429 }
      );
    }

    try {
      const body = await request.json();
      Logger.debug(Object.entries(body).map(([k, v]) => `${k}=${v}`).join(", "), { action: "Received request body" });

      const validatedData = submitSchema.parse(body);
      Logger.debug(Object.entries(validatedData).map(([k, v]) => `${k}=${v}`).join(", "), { action: "Validated data" });

      Logger.info("Attempting database insert", { action: "Database Operation" });

      const now = new Date().toISOString();
      const normalized_name = normalizeNameForDb(validatedData.full_name);

      const { error } = await supabaseServer
        .from("detainees")
        .insert({
          original_name: validatedData.full_name,
          full_name: validatedData.full_name,
          date_of_detention: validatedData.date_of_detention,
          last_seen_location: validatedData.last_seen_location,
          detention_facility: validatedData.detention_facility ?? null,
          physical_description: validatedData.physical_description ?? null,
          age_at_detention: validatedData.age_at_detention ?? null,
          gender: validatedData.gender,
          status: validatedData.status,
          contact_info: validatedData.contact_info,
          additional_notes: validatedData.additional_notes ?? null,
          last_update_date: now,
          source_organization: "Public",
          // Add metadata about known similar records
          metadata: validatedData.known_similar_records?.length ? {
            known_similar_records: validatedData.known_similar_records,
            is_intentional_duplicate: true
          } : null
        });

      if (error) {
        Logger.error("Database error", { error });
        return NextResponse.json(
          { error: "فشل في حفظ المعلومات" },
          { status: 500 }
        );
      }

      // Refresh materialized view to make the new record searchable
      const { error: refreshError } = await supabaseServer.rpc('refresh_mv_detainees_search');
      if (refreshError) {
        Logger.error("Failed to refresh search view", { error: refreshError });
        // Don't return error since the record was inserted successfully
      }

      // Record successful submission time for rate limiting
      const submissions = submissionTimes.get(ip) || [];
      submissions.push(Date.now());
      submissionTimes.set(ip, submissions);

      return NextResponse.json({ success: true });
    } catch (error) {
      Logger.error("Request error", { error });
      if (error instanceof z.ZodError) {
        const details = error.errors.map((err) => ({
          path: err.path,
          message: err.message,
        }));
        return NextResponse.json(
          { error: "بيانات غير صالحة", details },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "حدث خطأ أثناء معالجة الطلب" },
        { status: 500 }
      );
    }
  } catch (error) {
    Logger.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
