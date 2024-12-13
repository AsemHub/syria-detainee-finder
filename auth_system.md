# Authentication System Documentation

## Overview
The Syria Detainee Finder project uses Supabase Authentication integrated with Next.js 14, providing a secure and reliable authentication system with email-based authentication and session management.

## Technology Stack
- Supabase Auth
- Next.js Auth Helpers
- Next.js Middleware
- Server-side Session Management
- Client-side Auth Components

## Implementation Details

### 1. Authentication Flow
1. **Sign Up Process**
   - User enters email and password
   - Email verification is required
   - Account creation with proper role assignment
   - Redirect to verification page

2. **Sign In Process**
   - Email/Password authentication
   - Session token generation
   - Secure cookie storage
   - Automatic redirect to dashboard

3. **Session Management**
   - Server-side session validation
   - Automatic token refresh
   - Secure session storage in cookies
   - Cross-tab session synchronization

### 2. Security Measures

#### Route Protection
```typescript
// Middleware configuration for protected routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
```

#### Session Handling
- Secure cookie-based session storage
- Server-side session validation
- Automatic token refresh
- CSRF protection

#### Error Handling
- Retry mechanism for auth operations
- Network error recovery
- Graceful error state management
- User-friendly error messages

### 3. Key Components

#### Auth Callback Handler
```typescript
// Handles OAuth and email verification callbacks
export async function GET(request: Request) {
  // Process authentication callback
  // Exchange code for session
  // Handle errors and retries
  // Redirect to appropriate page
}
```

#### Middleware Protection
- All routes are protected by default
- Static assets are excluded
- Session validation on each request
- Automatic redirect to login

### 4. Directory Structure
```
src/
├── app/
│   └── auth/
│       ├── callback/      # Auth callback handling
│       ├── sign-in/       # Sign in page
│       ├── sign-up/       # Sign up page
│       └── verify/        # Email verification
├── components/
│   └── auth/             # Auth-related components
├── lib/
│   └── auth/             # Auth utilities
└── middleware.ts         # Auth middleware
```

### 5. Error Handling and Recovery

#### Retry Mechanism
```typescript
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 5000 // 5 seconds

// Exponential backoff for auth operations
async function exchangeCodeWithRetry(
  supabase: any,
  code: string,
  retries = MAX_RETRIES,
  currentDelay = INITIAL_RETRY_DELAY
): Promise<any> {
  // Implement retry logic with exponential backoff
}
```

### 6. Best Practices Implemented

1. **Security**
   - No token exposure in client code
   - Secure session storage
   - CSRF protection
   - Rate limiting

2. **User Experience**
   - Smooth error recovery
   - Clear error messages
   - Automatic redirects
   - Session persistence

3. **Performance**
   - Efficient token refresh
   - Optimized session checks
   - Minimal client-side code

### 7. Configuration Requirements

1. **Environment Variables**
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. **Supabase Setup**
   - Email authentication enabled
   - Password recovery configured
   - Proper redirect URLs set
   - CORS configuration

### 8. Common Operations

1. **Check Authentication Status**
```typescript
const isAuthenticated = await supabase.auth.getSession()
```

2. **Sign Out**
```typescript
await supabase.auth.signOut()
```

3. **Get User Profile**
```typescript
const user = await supabase.auth.getUser()
```

### 9. Troubleshooting

Common issues and solutions:
1. Session not persisting
   - Check cookie settings
   - Verify middleware configuration
   - Check for CORS issues

2. Authentication failures
   - Verify environment variables
   - Check network connectivity
   - Review callback URLs

3. Token refresh issues
   - Check session configuration
   - Verify refresh token storage
   - Review middleware setup
