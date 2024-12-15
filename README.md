# Syria Detainee Finder

A humanitarian web application dedicated to helping locate missing Syrian detainees and reuniting families. Built with Next.js 14, TypeScript, Tailwind CSS, and Shadcn UI components.

## Features

- 🔍 Advanced search functionality for detainee records
  - Full-text search
  - Filter by date, location, status, and more
  - Real-time results with relevance scoring
- 📝 Submission form for new detainee information
  - Structured data collection
  - File upload support
  - Form validation
- 📊 Bulk CSV upload for organizations
- 🌓 Dark/Light theme with custom green accent
- 📱 Fully responsive design
- ♿ Accessibility-first approach
- 🔒 Secure data handling with Supabase

## Tech Stack

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI
- **Database:** Supabase
- **Form Handling:** React Hook Form + Zod
- **Date Handling:** date-fns
- **Icons:** Lucide React

## Prerequisites

Before you begin, ensure you have:
- Node.js 18.17 or later
- npm or yarn
- A Supabase account and project

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/AsemHub/syria-detainee-finder.git
cd syria-detainee-finder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run favicons` - Generate favicon assets

## Project Structure

```
syria-detainee-finder/
├── src/
│   ├── app/             # Next.js App Router pages and API routes
│   │   ├── api/        # API endpoints
│   │   ├── about/      # About page
│   │   ├── submit/     # Submit information page
│   │   └── upload/     # Bulk upload page
│   ├── components/      # React components
│   │   ├── ui/        # Reusable UI components
│   │   └── [feature]/ # Feature-specific components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and configurations
│   └── styles/         # Global styles
├── public/             # Static assets
└── scripts/           # Build and utility scripts
```

## API Routes

- `GET /api/search` - Search for detainees with filters
- `POST /api/submit` - Submit new detainee information
- `POST /api/documents/[id]` - Upload documents for a detainee

## Contributing

This project is open to contributions. Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Documentation

For detailed technical documentation, please refer to [DOCUMENTATION.md](./DOCUMENTATION.md).

## Security

- Never commit `.env` files
- Keep API keys and sensitive data secure
- Follow security best practices when handling personal information
- Report security vulnerabilities responsibly

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Database by [Supabase](https://supabase.com)
- Icons from [Lucide](https://lucide.dev)
