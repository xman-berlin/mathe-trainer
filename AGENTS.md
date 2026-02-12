# AGENTS.md - Development Guidelines for Schlaufuchs

This file provides comprehensive guidelines for agentic coding assistants working on the Schlaufuchs project. Follow these rules to maintain code quality, consistency, and project standards.

## 🚀 Build, Lint & Test Commands

### Development Server
```bash
# Start development server (default port 4200)
npm start
# Alternative with polling for reliable file watching
npm run start:poll
# Hot module replacement
npm run start:hmr
```

### Building
```bash
# Production build (outputs to dist/)
npm run build
# Development build with source maps
npm run watch
```

### Testing
```bash
# Run all unit tests (Karma + Jasmine)
npm run test
# Run tests once (for CI/CD)
npm run test -- --watch=false --browsers=ChromeHeadless
# Run tests with code coverage
npm run test -- --code-coverage
# Run a single test file
npm run test -- --include="**/my-component.spec.ts"
# Run tests for a specific component
npm run test -- --include="**/exercise.component.spec.ts"
```

### Linting
```bash
# Run ESLint on all TypeScript and HTML files
npm run lint
```

### Pre-Commit Checklist
**ALWAYS run these commands before committing:**
1. `npm run lint` - Fix all ESLint errors
2. `npm run build` - Ensure build succeeds (ignore budget warnings < 500KB)
3. `npm run test -- --watch=false` - Run tests once

## 📝 Code Style Guidelines

### TypeScript Configuration
- **Strict mode**: All strict TypeScript checks enabled
- **Target**: ES2022
- **Module**: preserve (for Angular)
- **Strict injection parameters**: Enabled
- **Strict input access modifiers**: Enabled
- **Strict templates**: Enabled

### Angular-Specific Rules

#### Component Structure
```typescript
@Component({
  standalone: true,
  selector: 'app-component-name',  // kebab-case
  imports: [/* explicit imports only */],
  templateUrl: './component-name.component.html',
  styleUrls: ['./component-name.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush  // Always use OnPush
})
export class ComponentName implements OnInit, OnDestroy {
  // Signals for reactive state (preferred over RxJS)
  readonly mySignal = signal(initialValue);

  // Computed signals for derived state
  readonly computedValue = computed(() => {
    return this.mySignal() * 2;
  });

  // Effects for side effects
  constructor() {
    effect(() => {
      console.log('Signal changed:', this.mySignal());
    });
  }
}
```

#### Services
```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  private readonly mySignal = signal(initialValue);

  // Expose readonly signals
  readonly publicSignal = this.mySignal.asReadonly();

  constructor() {
    // Use inject() for dependencies (preferred in Angular 20)
    private dependency = inject(DependencyService);
  }
}
```

### Import Organization
```typescript
// Angular imports first
import { Component, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

// Third-party libraries
import { SupabaseClient } from '@supabase/supabase-js';

// Local imports - group by type
import { MyService } from '../../services/my.service';
import { MyModel } from '../../models/my.model';
import { MyComponent } from '../shared/my.component';

// Relative imports use barrel exports when available
import { StatsService, AuthService } from '../../services';
```

### Naming Conventions

#### Files and Directories
- **Components**: `component-name.component.ts`
- **Services**: `service-name.service.ts`
- **Models**: `model-name.model.ts`
- **Guards**: `guard-name.guard.ts`
- **Directories**: `kebab-case`

#### Code Elements
- **Classes**: `PascalCase` (e.g., `StatsService`, `ExerciseComponent`)
- **Interfaces**: `PascalCase` with `I` prefix avoided (e.g., `ExerciseType`)
- **Types**: `PascalCase` (e.g., `ExerciseType`)
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Variables/Methods**: `camelCase`
- **Signals**: `camelCase` with descriptive names
- **Private members**: Prefix with `_` (but avoid when possible)

#### Selectors
- **Components**: `app-component-name` (kebab-case)
- **Directives**: `appDirectiveName` (camelCase)

### Signals vs RxJS
- **Use Signals** for all new reactive state in components and services
- **Avoid RxJS** for UI state management (use signals + computed/effect)
- **RxJS allowed** for complex async operations or when interfacing with external APIs

### Error Handling
```typescript
// Service methods
async myMethod(): Promise<Result> {
  try {
    const result = await this.apiCall();
    return result;
  } catch (error) {
    console.error('[MyService] Failed to fetch data:', error);
    throw error; // Re-throw for caller to handle
  }
}

// Component effects
constructor() {
  effect(() => {
    try {
      this.processData();
    } catch (error) {
      console.error('Error processing data:', error);
      this.showError.set(true);
    }
  });
}
```

### Type Safety
- **Always use strict types** - avoid `any`
- **Interface over type alias** for complex objects
- **Union types** for constrained values
- **Generic constraints** when appropriate
- **Optional properties** with `?` for backward compatibility

```typescript
interface ExerciseStats {
  correct: number;
  incorrect: number;
}

type ExerciseType = 'addition' | 'subtraction' | 'multiplication' | 'division';

interface DailyStats {
  date: string;
  byType: Record<string, ExerciseStats>;
  dailyGoal?: number; // Optional for backward compatibility
}
```

### CSS and Styling
- **CSS Variables** for colors and common values
- **Mobile-first** responsive design
- **Breakpoints**: 540px (small mobile), 768px (tablet), 1024px (desktop)
- **Tablet landscape optimizations** for components > 750px height

### Testing Patterns
```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyService]
    });
    service = TestBed.inject(MyService);
  });

  it('should create service', () => {
    expect(service).toBeTruthy();
  });

  it('should handle signal updates', () => {
    // Test signal-based logic
    expect(service.myComputedValue()).toBe(expectedValue);
  });
});
```

### File Organization
```
src/app/
├── components/          # UI components
│   ├── shared/         # Reusable components
│   ├── exercise/       # Exercise-specific components
│   └── category-home/  # Category landing pages
├── services/           # Business logic services
├── models/            # TypeScript interfaces/types
├── guards/            # Route guards
└── utils/             # Helper functions
```

### Git Workflow
- **Branch naming**: `feature/description`, `fix/description`
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- **English commit messages and PR descriptions**
- **NEVER commit secrets** or environment files
- **Always run lint + build + tests** before committing

### Supabase Integration
- **RLS enabled** on all tables
- **Environment variables** for sensitive data (never commit)
- **Background sync** for offline-first experience
- **Error handling** for network failures

### Performance Considerations
- **ChangeDetectionStrategy.OnPush** for all components
- **Lazy loading** for routes when appropriate
- **Signal computed values** instead of getters
- **Avoid memory leaks** with proper effect cleanup

### Security
- **Never log secrets** or sensitive data
- **Validate user input** on both client and server
- **Use HTTPS** for all external requests
- **Sanitize HTML content** if displaying user-generated content

## 🔧 Development Tools

### Prettier Configuration
```json
{
  "printWidth": 100,
  "singleQuote": true
}
```

### ESLint Rules
- **Angular ESLint** recommended rules
- **TypeScript ESLint** strict rules
- **Unused variables** ignored when prefixed with `_`
- **Component selectors**: `app` prefix, camelCase for attributes, kebab-case for elements

## 📚 Resources
- [Angular Signals Documentation](https://angular.dev/guide/signals)
- [Angular Standalone Components](https://angular.dev/guide/standalone-components)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/)

## 🚨 Critical Reminders
- **Zoneless Angular**: Do not use `ChangeDetectorRef`
- **Signals over RxJS**: Use signals for UI state
- **Standalone components**: All components use `standalone: true`
- **Base href**: `/mathe-trainer/` for production (GitHub Pages)
- **Budget warnings**: Acceptable if < 500KB initial, < 16KB per component style</content>
<parameter name="filePath">/Users/xman/projects/mathe-trainer/AGENTS.md