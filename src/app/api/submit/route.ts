import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase.server"
import { z } from "zod"
import { Database, DetaineeGender, DetaineeStatus, Detainee } from "@/types"

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

const submitSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[\p{L}\s'-]+$/u, "Name can only contain letters, spaces, hyphens and apostrophes"),
  date_of_detention: z.string()
    .refine(val => !val || !isNaN(Date.parse(val)), "Invalid date format")
    .optional(),
  last_seen_location: z.string().min(2, "Location must be at least 2 characters")
    .max(200, "Location must be less than 200 characters"),
  detention_facility: z.string()
    .max(200, "Facility name must be less than 200 characters")
    .optional(),
  physical_description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  age_at_detention: z.union([
    z.number()
      .min(0, "Age cannot be negative")
      .max(120, "Age must be less than 120"),
    z.literal(""),
    z.null()
  ]).optional(),
  gender: z.enum(["male", "female", "unknown"] as const),
  status: z.enum(["in_custody", "missing", "released", "deceased", "unknown"] as const),
  contact_info: z.string()
    .max(50, "Contact info must be less than 50 characters"),
  additional_notes: z.string()
    .max(2000, "Notes must be less than 2000 characters")
    .optional(),
}) satisfies z.ZodType<Omit<Detainee, "id" | "created_at" | "last_update_date" | "search_vector">>;

export async function POST(request: Request) {
  try {
    // Verify Supabase connection
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables:', {
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
      console.log('Received request body:', body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Could not parse JSON' },
        { status: 400 }
      );
    }
    
    try {
      const validatedData = submitSchema.parse(body);
      console.log('Validated data:', validatedData);
      
      try {
        console.log('Attempting database insert...');
        const { data, error: insertError } = await supabaseServer
          .from('detainees')
          .insert({
            ...validatedData,
          } satisfies Database['public']['Tables']['detainees']['Insert'])
          .select()
          .single();

        if (insertError) {
          console.error('Database error:', {
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

        console.log('Database insert successful:', data);

        // Record the submission time for rate limiting
        const submissions = submissionTimes.get(ip) || [];
        submissions.push(Date.now());
        submissionTimes.set(ip, submissions);

        return NextResponse.json({
          message: 'Submission successful',
          id: data.id,
          timestamp: data.created_at
        });

      } catch (dbError) {
        console.error('Database connection error:', dbError);
        return NextResponse.json(
          { 
            error: 'Database connection failed',
            details: dbError instanceof Error ? dbError.message : 'Could not connect to database'
          },
          { status: 500 }
        );
      }

    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }

  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { 
        error: 'Submission failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
