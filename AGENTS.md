# Torre Tempo V4 - Agent Development Guide

**Version**: 4.0.0  
**For**: AI coding agents (Claude, Cursor, Copilot, etc.)  
**Updated**: February 5, 2026

---

## 🏗️ Project Architecture

**Type**: npm workspaces monorepo with Turbo  
**Stack**: React 18 + Vite + Express + PostgreSQL + Redis  
**Node**: >=20.0.0 | npm: >=10.0.0

**Workspaces**:
- `apps/api` - Express backend with Better Auth, Drizzle ORM, BullMQ
- `apps/web` - React 18 frontend with Vite, TailwindCSS, PWA
- `packages/shared` - Shared types and permissions

---

## ⚡ Build/Dev/Test Commands

### Root Commands (Turbo-orchestrated)
```bash
npm run dev      # Start all dev servers
npm run build    # Build all workspaces
npm run lint     # Lint all workspaces
npm run clean    # Clean all + node_modules
```

### Workspace-Specific Commands
```bash
# API (port 3000)
npm run dev --workspace=api      # tsx watch src/index.ts
npm run build --workspace=api    # tsc compilation
npm run start --workspace=api    # node dist/index.js

# Web (port 5173)
npm run dev --workspace=web      # vite dev server
npm run build --workspace=web    # tsc && vite build
npm run preview --workspace=web  # vite preview

# Shared library
npm run build --workspace=shared  # tsc compilation
```

### Testing
⚠️ **No test framework configured** - Add Jest/Vitest if needed

### Type Checking
```bash
# Check types without building
cd apps/web && npx tsc --noEmit
cd apps/api && npx tsc --noEmit
```

---

## 📝 Code Style Guidelines

### Import Organization (STRICT ORDER)

**Frontend (React components)**:
```typescript
// 1. React and React ecosystem
import * as React from 'react';
import { useState, useEffect } from 'react';

// 2. External libraries (alphabetical)
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, AlertCircle } from 'lucide-react';

// 3. UI components (@/components/ui/*)
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// 4. Internal components and hooks
import { useAuth } from '@/hooks/useAuth';
import { SomeComponent } from '@/components/feature/SomeComponent';

// 5. Utils and helpers
import { cn } from '@/lib/utils';

// 6. API clients and services
import { fetchData } from '@/lib/api/endpoint';

// 7. Types (always last, always with 'type' keyword)
import type { MyType, OtherType } from '@/types/module';
```

**Backend (API routes)**:
```typescript
// 1. Express and Node.js
import { Router, Request, Response } from 'express';

// 2. External libraries
import { and, eq, desc } from 'drizzle-orm';

// 3. Database and schema
import { db } from '../db/index.js';
import { table_name } from '../db/schema.js';

// 4. Middleware and services
import { requireRole } from '../middleware/requireRole.js';
import { logAudit } from '../services/audit.service.js';

// 5. Types (if any)
import type { SomeType } from '../types/module.js';
```

### TypeScript Patterns

**Prefer `interface` for object shapes**:
```typescript
// ✅ Good
export interface ClockInSheetProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId?: string;
}

// ❌ Avoid
export type ClockInSheetProps = {
  isOpen: boolean;
  // ...
}
```

**Use `type` for unions, intersections, utilities**:
```typescript
// ✅ Good
type Status = 'pending' | 'approved' | 'rejected';
type SwapWithUser = Swap & { user: User };
```

**Component Props**: Always explicit interface
```typescript
export interface MyComponentProps {
  title: string;
  count?: number;
  onAction: () => void;
}

export function MyComponent({ title, count = 0, onAction }: MyComponentProps) {
  // ...
}
```

**Function Return Types**: Explicit for exported functions
```typescript
// ✅ Good - explicit return type
export async function fetchSwaps(slug: string): Promise<Swap[]> {
  // ...
}

// ⚠️ OK for internal functions (inference allowed)
function formatDate(date: Date) {
  return date.toISOString();
}
```

### Naming Conventions

**Files**:
- Components: `PascalCase.tsx` (e.g., `ClockInSheet.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useOfflineQueue.ts`)
- Utils/Lib: `kebab-case.ts` (e.g., `offline-queue.ts`)
- API routes: `kebab-case.ts` (e.g., `time-entries.ts`)
- Types: `kebab-case.ts` (e.g., `swap-types.ts`)

**Variables/Functions**:
- camelCase: `const userName`, `function handleClick()`
- PascalCase: React components only
- UPPER_SNAKE_CASE: Constants only

**React Components**:
```typescript
// ✅ Named export for components
export function ClockInSheet({ isOpen, onClose }: Props) {
  // ...
}

// ❌ Avoid default export for components
export default function ClockInSheet() { ... }
```

**API Routes**:
```typescript
// ✅ Named functions with descriptive names
async function handleClockIn(req: Request, res: Response) {
  // ...
}

router.post('/clock-in', handleClockIn);
```

### Component Structure (Consistent Order)

```typescript
/**
 * Component Name
 * Brief description of what this component does
 */

// 1. Imports (see import order above)

// 2. Types/Interfaces for this file
export interface ComponentProps { }
type LocalType = { };

// 3. Constants
const SOME_CONSTANT = 'value';
const CONFIG = { ... };

// 4. Helper functions (non-exported)
function helperFunction() { }

// 5. Main component
export function Component(props: ComponentProps) {
  // 5a. Hooks (React, custom hooks)
  const [state, setState] = useState();
  const customHook = useCustomHook();
  
  // 5b. Derived state/memos
  const computed = useMemo(() => {}, []);
  
  // 5c. Effects
  useEffect(() => {}, []);
  
  // 5d. Event handlers
  const handleClick = () => {};
  
  // 5e. Render helpers (if any)
  const renderItem = () => {};
  
  // 5f. JSX
  return ( ... );
}

// 6. Sub-components or exports (if any)
```

### Error Handling

**API Routes** (Express):
```typescript
router.post('/endpoint', async (req: Request, res: Response) => {
  try {
    // Validate inputs first
    if (!req.body.field) {
      return res.status(400).json({ message: 'Field is required' });
    }
    
    // Business logic
    const result = await someOperation();
    
    // Success response
    res.json({ message: 'Success', data: result });
  } catch (error) {
    // Log error
    console.error('Error in endpoint:', error);
    
    // Generic error response (don't leak internals)
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

**React Components**:
```typescript
try {
  await apiCall();
  setSuccess(true);
} catch (err) {
  // Type-safe error handling
  if (err instanceof CustomApiError) {
    setError(err.message);
  } else {
    setError('An unexpected error occurred');
  }
}
```

**Custom Error Classes**:
```typescript
export class TimeEntryApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'TimeEntryApiError';
  }
}
```

---

## 🎨 Styling Conventions

**Tailwind CSS** (utility-first):
- Use `cn()` helper from `@/lib/utils` for conditional classes
- Define reusable utilities in `globals.css` (e.g., `glass-card`)
- Prefer Tailwind utilities over custom CSS

**Example**:
```typescript
<div className={cn(
  "flex items-center gap-2 px-4 py-2 rounded-xl",
  "bg-zinc-900/50 border border-zinc-800",
  isActive && "bg-emerald-500/20 border-emerald-500/50",
  disabled && "opacity-50 cursor-not-allowed"
)}>
```

---

## 🔧 TypeScript Configuration

**Strict Mode Enabled**:
- `noUnusedLocals: true` - Remove unused variables
- `noUnusedParameters: true` - Remove unused function params
- `noUncheckedIndexedAccess: true` - Safe array/object access
- `noFallthroughCasesInSwitch: true` - Explicit breaks in switch

**Path Aliases**:
- `@/*` → `./src/*`
- `@torretempo/shared` → `../../packages/shared/src/index.ts`

**Never Use**:
- `any` type (use `unknown` instead)
- `@ts-ignore` (fix the actual type issue)
- `as` type assertions (except for DOM elements)

---

## 📦 Key Libraries & Patterns

### Frontend
- **State**: Zustand for global, useState for local
- **Data Fetching**: Custom fetch wrappers (no React Query in use yet)
- **Routing**: React Router v7
- **UI**: Radix UI primitives + custom components
- **Animations**: Framer Motion
- **Forms**: Controlled components (no form library)
- **Offline**: IndexedDB via `idb` package

### Backend
- **Auth**: Better Auth v1.1.5 (organization + admin plugins)
- **ORM**: Drizzle ORM v0.38.3
- **Queue**: BullMQ v5.32.2
- **Validation**: Manual (no Zod on routes yet)

---

## 🚨 Critical Rules

### Security
1. **Never** commit API keys, secrets, or credentials
2. **Always** use `.env` for configuration
3. **Always** validate user input server-side
4. **Never** disable TypeScript strict checks
5. **Always** use parameterized queries (Drizzle handles this)

### Database
1. **Always** use Drizzle ORM (no raw SQL except migrations)
2. **Never** use `DELETE CASCADE` without explicit reasoning
3. **Always** include `organization_id` in queries (RLS)
4. **Always** use transactions for multi-table operations

### PWA & Offline
1. **Always** queue actions when offline (use `useOfflineQueue`)
2. **Never** assume network availability
3. **Always** handle offline → online transitions
4. **Always** show connection status to users

### Performance
1. **Use** `React.memo()` for expensive components
2. **Use** `useMemo()`/`useCallback()` appropriately
3. **Avoid** premature optimization
4. **Always** check bundle size after adding dependencies

---

## 🧪 Testing Strategy (When Implemented)

Tests should follow this structure:
```typescript
describe('ComponentName', () => {
  it('should render with required props', () => {
    // Arrange
    // Act
    // Assert
  });
  
  it('should handle user interaction', () => {
    // ...
  });
});
```

---

## 📐 Architecture Decisions

### Frontend Patterns
- **Components**: Functional components with hooks (no class components)
- **State Management**: Lift state up, use Zustand for global
- **Error Boundaries**: Not yet implemented (add if needed)
- **Code Splitting**: Not yet implemented (add for large routes)

### Backend Patterns
- **Routes**: RESTful, one route file per resource
- **Middleware**: Composable, order matters
- **Services**: Business logic extracted to services/
- **Validation**: Manual validation in routes (consider Zod)

### Database Patterns
- **RLS**: Row-Level Security enforced on 12 tables
- **Audit Trail**: SHA-256 hash chain (immutable)
- **Soft Deletes**: Not used (hard deletes only)
- **UUIDs**: Used for all IDs

---

## 📚 Additional Resources

- **README.md** - Project overview and quick start
- **TESTING.md** - Comprehensive test procedures
- **DEPLOYMENT.md** - Production deployment guide
- **apps/web/src/components/ui/** - Reusable UI components (shadcn/ui based)
- **apps/api/src/db/schema.ts** - Complete database schema

---

## 💡 Tips for AI Agents

1. **Before editing**: Always read the full file to understand context
2. **Import organization**: Follow the strict order documented above
3. **Type safety**: Prefer explicit types over inference for exported APIs
4. **Consistency**: Match existing patterns in the same directory
5. **Documentation**: Add JSDoc comments for complex functions
6. **No console.logs**: Remove debug logs before committing
7. **PWA-first**: Always consider offline scenarios
8. **Mobile-first**: Design for touch, enhance for desktop

---

**Last Updated**: Phase 3 Complete (v4.0.0)  
**Maintainer**: Development Team  
**Questions**: Refer to README.md or project documentation
