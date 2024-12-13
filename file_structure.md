# Syria Detainee Finder - File Structure

```
syria-detainee-finder/
├── .git/
├── .gitignore
├── .next/
├── .swc/
├── .vscode/
├── coverage/
├── node_modules/
├── public/
├── src/
│   ├── app/
│   │   ├── search/
│   │   ├── submit/
│   │   ├── bulk-upload/
│   │   ├── about/
│   │   └── privacy/
│   ├── components/
│   │   ├── ui/
│   │   ├── form/
│   │   ├── layout/
│   │   └── search/
│   ├── hooks/
│   ├── lib/
│   │   └── supabase/
│   ├── middleware/
│   ├── styles/
│   ├── test/
│   ├── types/
│   └── utils/
├── supabase/
│   ├── functions/
│   ├── triggers/
│   └── policies/
├── README.md
├── components.json
├── eslint.config.mjs
├── implementation_plan.md
├── jest.config.js
├── jest.setup.js
├── next-env.d.ts
├── next.config.js
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── supabase_implementation.md
├── tailwind.config.ts
├── translation_plan.md
└── tsconfig.json

## Directory Overview (Updated)

### `/src/app` (Current Structure)
- `/search`: Search functionality
- `/submit`: Submission forms
- `/bulk-upload`: CSV upload handling
- `/about`: About pages
- `/privacy`: Privacy policy
- Global layout and styling files

### `/src/components`
- `/ui`: shadcn/ui components
  - Custom themed components
  - Shared UI elements
- Form components
- Layout components
- Search components

### `/src/hooks`
- Supabase query hooks
- Form handling hooks
- State management hooks

### `/src/lib`
- Supabase client configuration
- API utilities
- Type definitions

### `/src/middleware`
- Rate limiting middleware
- API middleware

### `/src/utils`
- Data transformation helpers
- Validation utilities
- Search helpers

### `/supabase`
- Edge Functions
- Database triggers
- RLS policies

### Root Directory
- Configuration files for TypeScript, Next.js, ESLint, Jest, and other tools
- Project documentation (README.md, implementation_plan.md, translation_plan.md, supabase_implementation.md)
- Package management files (package.json, package-lock.json)
- Components configuration (components.json) for shadcn/ui

### Other Directories
- `.next/`: Next.js build output
- `.swc/`: SWC compiler cache
- `.vscode/`: VS Code configuration
- `coverage/`: Test coverage reports
- `node_modules/`: Project dependencies
- `public/`: Static assets and files
