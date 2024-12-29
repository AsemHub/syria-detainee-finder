import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase.server"
import { z } from "zod"
import { Database } from "@/lib/database.types"
import { normalizeNameForDb } from "@/lib/validation"
import Logger from "@/lib/logger"

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
  .optional()
  .transform(val => val == null || val === undefined ? null : val),
  gender: z.enum(["male", "female", "unknown"] as const),
  status: z.enum(["in_custody", "missing", "released", "deceased", "unknown"] as const),
  contact_info: z.string()
    .max(50, "Contact info must be less than 50 characters"),
  additional_notes: z.string()
    .max(2000, "Notes must be less than 2000 characters")
    .nullable()
    .optional(),
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
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
      Logger.debug('Received request body:', body);
    } catch (parseError) {
      Logger.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Could not parse JSON' },
        { status: 400 }
      );
    }
    
    try {
      const validatedData = submitSchema.parse(body);
      Logger.debug('Validated data:', validatedData);
      
      try {
        Logger.info('Attempting database insert...');
        
        const now = new Date().toISOString();
        
        // Prepare the data for insert, ensuring all fields match the database schema
        const insertData: DetaineeInsert = {
          full_name: validatedData.full_name,
          original_name: validatedData.full_name, // Store the original name
          date_of_detention: validatedData.date_of_detention ?? null,
          last_seen_location: validatedData.last_seen_location,
          detention_facility: validatedData.detention_facility ?? null,
          physical_description: validatedData.physical_description ?? null,
          age_at_detention: validatedData.age_at_detention ?? null,
          gender: validatedData.gender,
          status: validatedData.status,
          contact_info: validatedData.contact_info,
          additional_notes: validatedData.additional_notes ?? null,
          last_update_date: now,
          source_organization: 'Public' // Source organization is always 'Public' for public submissions
        };

        // Insert the data
        const { data, error: insertError } = await supabaseServer
          .from('detainees')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          Logger.error('Database error:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint
          });
          return NextResponse.json(
            { 
              error: 'Database operation failed', 
              details: insertError.message,
              code: insertError.code,
              hint: insertError.hint 
            },
            { status: 500 }
          );
        }

        Logger.info('Database insert successful:', data);

        // Record the submission time for rate limiting
        const submissions = submissionTimes.get(ip) || [];
        submissions.push(Date.now());
        submissionTimes.set(ip, submissions);

        return NextResponse.json({ success: true, data });
      } catch (dbError) {
        Logger.error('Database operation error:', dbError);
        return NextResponse.json(
          { error: 'Database operation failed', details: String(dbError) },
          { status: 500 }
        );
      }
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        Logger.error('Validation error:', validationError.errors);
        return NextResponse.json(
          { error: 'Validation failed', details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
  } catch (error) {
    Logger.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
