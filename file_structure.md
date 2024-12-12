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
│   ├── components/
│   │   ├── auth/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   │   └── auth/
│   ├── middleware.ts
│   ├── styles/
│   ├── test/
│   ├── types/
│   └── utils/
├── supabase/
│   └── functions/
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
```

## Directory Overview

### Root Directory
- Configuration files for TypeScript, Next.js, ESLint, Jest, and other tools
- Project documentation (README.md, implementation_plan.md, translation_plan.md, supabase_implementation.md)
- Package management files (package.json, package-lock.json)
- Components configuration (components.json) for shadcn/ui

### `/src`
- Main source code directory

#### `/src/app`
- Next.js 14 App Router pages and layouts
- API routes and server components

#### `/src/components`
- Reusable React components
- UI components using shadcn/ui
- Authentication components (sign-in, sign-up forms)

#### `/src/hooks`
- Custom React hooks for state management and functionality

#### `/src/lib`
- Shared libraries and utilities
- Authentication context and utilities

#### `/src/middleware.ts`
- Next.js middleware for routing and authentication

#### `/src/styles`
- Global styles and Tailwind CSS configurations

#### `/src/test`
- Test utilities and setup files
- Component and integration tests

#### `/src/types`
- TypeScript type definitions
- Shared interfaces and types

#### `/src/utils`
- Utility functions and helpers
- Helper functions for testing

### `/supabase`
- Supabase Edge Functions
- Serverless API implementations

### `/public`
- Static assets and files
- Images and icons

### Other Directories
- `.next/`: Next.js build output
- `.swc/`: SWC compiler cache
- `.vscode/`: VS Code configuration
- `coverage/`: Test coverage reports
- `node_modules/`: Project dependencies
