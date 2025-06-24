# Contributing to SiteWise

Thank you for your interest in contributing to SiteWise! This document provides guidelines and information for contributors to help you get started and make meaningful contributions to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [How to Contribute](#how-to-contribute)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Documentation](#documentation)
8. [Pull Request Process](#pull-request-process)
9. [Issue Guidelines](#issue-guidelines)
10. [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@sitewise.in].

## Getting Started

### Ways to Contribute

There are many ways to contribute to SiteWise:

#### 🐛 **Bug Reports**
- Report bugs you've found
- Help verify and reproduce reported issues
- Test bug fixes

#### ✨ **Feature Contributions**
- Implement new features
- Improve existing functionality
- Enhance user experience

#### 📖 **Documentation**
- Improve existing documentation
- Add missing documentation
- Translate documentation
- Create tutorials and guides

#### 🧪 **Testing**
- Write unit tests
- Add integration tests
- Improve test coverage
- Test new features

#### 🎨 **Design & UX**
- Improve user interface
- Enhance user experience
- Create mockups and prototypes
- Accessibility improvements

#### 🔧 **DevOps & Infrastructure**
- Improve build processes
- Enhance CI/CD pipelines
- Docker configurations
- Deployment improvements

### Prerequisites

Before contributing, make sure you have:

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Git** for version control
- **GitHub account** for collaboration
- **PocketBase** for backend development
- Basic knowledge of **Vue.js**, **TypeScript**, and **TailwindCSS**

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub first, then clone your fork
git clone https://github.com/YOUR_USERNAME/construction-tracker.git
cd construction-tracker

# Add the original repository as upstream
git remote add upstream https://github.com/site-wise/app.git
```

### 2. Install Dependencies

```bash
# Install project dependencies
npm install
```

### 3. Environment Setup

```bash
# Copy environment example file
cp .env.example .env

# Edit .env with your configuration
# VITE_POCKETBASE_URL=http://127.0.0.1:8090
# VITE_APP_NAME=SiteWise
# VITE_APP_ENV=development
```

### 4. PocketBase Setup

1. Download PocketBase from [https://pocketbase.io](https://pocketbase.io)
2. Start PocketBase server:
   ```bash
   ./pocketbase serve
   ```
3. Access PocketBase admin at `http://127.0.0.1:8090/_/`
4. Set up collections according to [pocketbase-schema.md](pocketbase-schema.md)
5. Configure API rules from [pocketbase-api-rules.md](pocketbase-api-rules.md)

### 5. Start Development

```bash
# Start the development server
npm run dev

# In another terminal, run tests
npm run test

# Optional: Run tests in watch mode
npm run test:watch
```

### 6. Verify Setup

- Visit `http://localhost:5173` to see the application
- Create a test account and site
- Verify all features are working correctly

## How to Contribute

### 1. Choose an Issue

- Browse [existing issues](https://github.com/ORIGINAL_OWNER/construction-tracker/issues)
- Look for issues labeled `good first issue` for beginners
- Check if the issue is already assigned
- Comment on the issue to express interest

### 2. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a new branch for your work
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make Changes

- Follow our [coding standards](#coding-standards)
- Write tests for your changes
- Update documentation if needed
- Test your changes thoroughly

### 4. Commit Changes

```bash
# Add your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add user role management functionality"
```

#### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add password reset functionality
fix(dashboard): resolve chart rendering issue
docs: update installation instructions
test(items): add unit tests for item service
```

### 5. Push and Create Pull Request

```bash
# Push your branch to your fork
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Coding Standards

### TypeScript Guidelines

```typescript
// Use explicit types
interface User {
  id: string;
  email: string;
  name: string;
}

// Use meaningful variable names
const activeUsers = users.filter(user => user.isActive);

// Use async/await instead of promises
async function fetchUserData(userId: string): Promise<User> {
  try {
    const response = await api.getUser(userId);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
```

### Vue.js Best Practices

```vue
<template>
  <!-- Use semantic HTML -->
  <main class="dashboard">
    <header>
      <h1>{{ pageTitle }}</h1>
    </header>
    
    <!-- Use v-for with keys -->
    <div 
      v-for="item in items" 
      :key="item.id"
      class="item-card"
    >
      {{ item.name }}
    </div>
  </main>
</template>

<script setup lang="ts">
// Use Composition API with TypeScript
import { ref, computed, onMounted } from 'vue';
import type { Item } from '@/services/pocketbase';

// Define props with types
interface Props {
  siteId: string;
}

const props = defineProps<Props>();

// Use reactive data
const items = ref<Item[]>([]);
const loading = ref(false);

// Use computed properties
const pageTitle = computed(() => 
  `Items for Site ${props.siteId}`
);

// Lifecycle hooks
onMounted(async () => {
  await loadItems();
});
</script>
```

### CSS/TailwindCSS Guidelines

```vue
<template>
  <!-- Use consistent spacing -->
  <div class="p-6 bg-white rounded-lg shadow-md">
    <!-- Use semantic color classes -->
    <h2 class="text-xl font-semibold text-gray-900 mb-4">
      Title
    </h2>
    
    <!-- Use responsive design -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Content -->
    </div>
    
    <!-- Use consistent button styles -->
    <button class="btn-primary mt-4">
      Save Changes
    </button>
  </div>
</template>

<style scoped>
/* Use CSS custom properties for theme colors */
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500;
}
</style>
```

### File Organization

```
src/
├── components/
│   ├── common/          # Reusable components
│   ├── forms/           # Form components
│   └── layout/          # Layout components
├── composables/
│   ├── useAuth.ts       # Authentication logic
│   └── useApi.ts        # API calls
├── services/
│   └── pocketbase.ts    # Backend services
├── types/
│   └── index.ts         # Type definitions
├── utils/
│   ├── helpers.ts       # Utility functions
│   └── constants.ts     # App constants
└── views/
    ├── auth/            # Authentication pages
    └── dashboard/       # Dashboard pages
```

## Testing Guidelines

### Unit Tests

```typescript
// src/composables/__tests__/useAuth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  it('should login user with valid credentials', async () => {
    const { login, isAuthenticated } = useAuth();
    
    const result = await login('test@example.com', 'password');
    
    expect(result).toBe(true);
    expect(isAuthenticated.value).toBe(true);
  });

  it('should handle login failure', async () => {
    const { login, error } = useAuth();
    
    const result = await login('invalid@example.com', 'wrong');
    
    expect(result).toBe(false);
    expect(error.value).toBeTruthy();
  });
});
```

### Component Tests

```typescript
// src/components/__tests__/ItemCard.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ItemCard from '../ItemCard.vue';

describe('ItemCard', () => {
  it('renders item information correctly', () => {
    const item = {
      id: '1',
      name: 'Cement',
      unit: 'kg'
    };

    const wrapper = mount(ItemCard, {
      props: { item }
    });

    expect(wrapper.text()).toContain('Cement');
    expect(wrapper.text()).toContain('kg');
  });
});
```

### Test Coverage

Aim for:
- **Unit Tests**: 80%+ coverage for utilities and composables
- **Component Tests**: Cover key user interactions
- **Integration Tests**: Test critical user workflows

Run tests:
```bash
npm run test              # Run all tests
npm run test:coverage     # Generate coverage report
npm run test:ui          # Run tests with UI
```

## Documentation

### Code Documentation

```typescript
/**
 * Calculates the total expense for a construction site
 * @param siteId - The unique identifier for the site
 * @param dateRange - Optional date range for calculation
 * @returns Promise resolving to total expense amount
 */
async function calculateSiteExpense(
  siteId: string, 
  dateRange?: DateRange
): Promise<number> {
  // Implementation
}
```

### Component Documentation

```vue
<template>
  <!-- Component template -->
</template>

<script setup lang="ts">
/**
 * ItemCard Component
 * 
 * Displays item information in a card format with options
 * for viewing details and performing actions.
 * 
 * @example
 * <ItemCard 
 *   :item="item" 
 *   @edit="handleEdit" 
 *   @delete="handleDelete" 
 * />
 */

interface Props {
  /** The item object to display */
  item: Item;
  /** Whether edit actions are enabled */
  editable?: boolean;
}
</script>
```

### README Updates

When adding new features, update relevant documentation:
- Main README.md
- User Guide (USER_GUIDE.md)
- Technical Documentation (DOCUMENTATION.md)
- API documentation

## Pull Request Process

### Before Submitting

1. **Test Your Changes**
   ```bash
   npm run test
   npm run build
   npm run lint
   ```

2. **Update Documentation**
   - Add/update code comments
   - Update user documentation if needed
   - Update technical documentation

3. **Check Your Code**
   - Follow coding standards
   - Remove debugging code
   - Ensure proper error handling

### PR Template

When creating a pull request, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and checks
2. **Code Review**: Maintainers review your code
3. **Feedback**: Address any review comments
4. **Approval**: Get approval from maintainers
5. **Merge**: Maintainers merge your PR

## Issue Guidelines

### Reporting Bugs

Use the bug report template:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment**
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 91]
- Version: [e.g. 1.0.0]
```

### Feature Requests

Use the feature request template:

```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should this work?

**Alternatives Considered**
Any alternative solutions?

**Additional Context**
Screenshots, mockups, etc.
```

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `documentation`: Documentation needs improvement
- `good first issue`: Good for newcomers
- `help wanted`: Community help needed
- `question`: Further information requested
- `wontfix`: This will not be worked on
- `duplicate`: This issue already exists

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Community discussions
- **Discord/Slack**: Real-time chat (if available)
- **Email**: For sensitive issues

### Getting Help

If you need help:

1. **Check Documentation**: README, guides, and docs
2. **Search Issues**: Someone might have asked before
3. **Ask in Discussions**: Community can help
4. **Create an Issue**: For bugs or feature requests

### Mentorship

We welcome newcomers! If you're new to:

- **Open Source**: We'll help you learn the process
- **Vue.js/TypeScript**: Point you to learning resources
- **Construction Domain**: Explain industry concepts

Look for issues labeled `good first issue` and don't hesitate to ask questions.

## Recognition

Contributors are recognized in:

- **README**: Major contributors listed
- **Release Notes**: Contributors credited
- **Hall of Fame**: Special recognition page
- **Swag**: Stickers and merchandise for significant contributions

## License

By contributing to SiteWise, you agree that your contributions will be licensed under the MIT License that covers the project.

## Questions?

If you have questions about contributing, please:

1. Check this document first
2. Search existing issues and discussions
3. Create a new discussion or issue
4. Contact maintainers directly if needed

**Contact**: [contributors@sitewise.in]

---

Thank you for contributing to SiteWise! Your efforts help make construction management more efficient for everyone. 🏗️✨