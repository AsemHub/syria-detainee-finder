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
    // Check if Supabase URL and key are configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error("Supabase configuration is missing");
    }

    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown";
    
    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json()
    console.log("Received data:", body);

    const validatedData = submitSchema.parse(body)
    console.log("Validated data:", validatedData);

    // Sanitize and normalize the data
    const normalizedData = {
      ...validatedData,
      full_name: validatedData.full_name.trim(),
      last_seen_location: validatedData.last_seen_location.trim(),
      detention_facility: validatedData.detention_facility?.trim(),
      physical_description: validatedData.physical_description?.trim(),
      contact_info: validatedData.contact_info.trim(),
      additional_notes: validatedData.additional_notes?.trim(),
      date_of_detention: validatedData.date_of_detention || null,
      last_update_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
    console.log("Normalized data:", normalizedData);

    const { data, error } = await supabaseServer
      .from("detainees")
      .insert([normalizedData])
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      )
    }

    // Record successful submission for rate limiting
    const submissions = submissionTimes.get(ip) || [];
    submissions.push(Date.now());
    submissionTimes.set(ip, submissions);

    return NextResponse.json({ 
      success: true, 
      data,
      message: "Detainee information submitted successfully" 
    })
  } catch (error) {
    console.error("Submit error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: "Failed to submit detainee information",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
