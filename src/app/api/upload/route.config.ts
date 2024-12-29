// Configure route segment for file uploads
export const fetchCache = 'force-no-store'; // Disable caching for uploads
export const revalidate = 0; // Disable revalidation
export const dynamic = 'force-dynamic'; // Force dynamic rendering

// Configure serverless function
export const runtime = 'nodejs'; // Use Node.js runtime
export const maxDuration = 60; // Set maximum duration to 60 seconds
export const preferredRegion = 'fra1'; // Deploy to Frankfurt for EU users

// Configure body size limit for file uploads (10MB)
export const bodySize = '10mb';
