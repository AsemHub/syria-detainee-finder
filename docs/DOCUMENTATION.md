# Syria Detainee Finder - Technical Documentation

## Project Overview

Syria Detainee Finder is a humanitarian web application designed to help locate missing Syrian detainees and reunite families. The application provides a platform for searching existing records of detainees and submitting new information about missing persons.

## Technical Stack

### Core Technologies
- **Frontend Framework**: Next.js 14.0.4 (React 18.2.0)
- **Database**: Supabase
- **Styling**: TailwindCSS 3.4.1
- **UI Components**: shadcn/ui with Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation
- **Type Safety**: TypeScript
- **State Management**: React Hooks and Context

### Key Dependencies
- `@supabase/supabase-js`: Database interaction
- `next-themes`: Dark mode support
- `react-hook-form`: Form management
- `zod`: Schema validation
- `date-fns`: Date manipulation
- `lucide-react`: Icon system

## Architecture

### Directory Structure
```
src/
├── app/                    # Next.js app router pages and API routes
│   ├── api/               # API endpoints
│   ├── about/             # About page
│   ├── submit/            # Submit information page
│   └── upload/            # Bulk upload page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── [feature]/        # Feature-specific components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
└── styles/               # Global styles and CSS modules
```

### Database Schema

#### Tables
1. **detainees**
   - Primary information about detained individuals
   - Fields include: full name, detention date, location, status, etc.

2. **documents**
   - Supporting documents and files related to detainees
   - Fields include: file URL, document type, submission date, etc.

### API Routes

1. **/api/search**
   - GET endpoint for searching detainee records
   - Supports filtering by multiple parameters
   - Uses Supabase's full-text search capabilities

2. **/api/submit**
   - POST endpoint for submitting new detainee information
   - Includes validation and sanitization

3. **/api/documents/[id]**
   - Handles document upload and retrieval
   - Supports various document types

## Features

### 1. Search Functionality
- Advanced search with multiple filters:
  - Full-text search
  - Date range filtering
  - Status filtering
  - Location filtering
  - Gender filtering
  - Age range filtering
- Real-time search results
- Relevance scoring

### 2. Information Submission
- Structured form for submitting detainee information
- File upload support
- Form validation
- Success/error notifications

### 3. Bulk Upload
- CSV file upload for multiple records
- Validation and error reporting
- Progress tracking

### 4. User Interface
- Responsive design
- Dark/light mode support
- Loading states
- Error handling
- Accessibility features

## Configuration

### Environment Variables
Required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` with required variables
4. Run development server:
   ```bash
   npm run dev
   ```

### Build and Deployment
1. Build the application:
   ```bash
   npm run build
   ```
2. Start production server:
   ```bash
   npm start
   ```

## Security Considerations

1. **Data Protection**
   - Sensitive information is stored securely in Supabase
   - Environment variables for API keys
   - Input sanitization

2. **API Security**
   - Rate limiting on API routes
   - Input validation using Zod
   - Error handling to prevent information leakage

## Performance Optimizations

1. **Frontend**
   - Next.js image optimization
   - Code splitting
   - Dynamic imports
   - Cached search results

2. **Backend**
   - Efficient database queries
   - Pagination for large result sets
   - Optimized file uploads

## Future Enhancements

1. **Planned Features**
   - User authentication system
   - Advanced document management
   - Multi-language support
   - Enhanced search algorithms
   - Mobile application

2. **Technical Improvements**
   - Implement caching layer
   - Add comprehensive test suite
   - Set up continuous integration
   - Implement analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and confidential. All rights reserved.

---

*Last updated: December 15, 2024*
