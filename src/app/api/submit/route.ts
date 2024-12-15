import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase.server"
import { z } from "zod"

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
  age_at_detention: z.number()
    .min(0, "Age cannot be negative")
    .max(120, "Age must be less than 120")
    .optional(),
  gender: z.enum(["male", "female", "other"]),
  status: z.enum(["missing", "released", "deceased"]),
  contact_info: z.string()
    .min(2, "Contact information is required")
    .max(500, "Contact information must be less than 500 characters"),
  additional_notes: z.string()
    .max(2000, "Notes must be less than 2000 characters")
    .optional(),
})

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
          .insert([{
            ...validatedData,
            last_update_date: new Date().toISOString(),
            created_at: new Date().toISOString()
          }])
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

        // Manually refresh the materialized view
        const { error: refreshError } = await supabaseServer
          .rpc('refresh_detainees_search_mv');

        if (refreshError) {
          console.log('Failed to refresh materialized view:', refreshError);
          // Don't return error here, the insert was successful
        }

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
