# Store Testing Guide

This document provides guidelines for testing the Zustand store slices in this project.

## 📁 Test Structure

```
src/store/__tests__/
├── fileSlice.test.ts      # Tests for file management
├── editorSlice.test.ts    # Tests for editor settings
├── uiSlice.test.ts        # Tests for UI state
├── aiSlice.test.ts        # Tests for AI features (TODO)
└── terminalSlice.test.ts  # Tests for terminal (TODO)
```

## 🧪 Running Tests

### Run all tests
```bash
npx vitest run src/store/__tests__/
```

### Run specific test file
```bash
npx vitest run src/store/__tests__/fileSlice.test.ts
```

### Run in watch mode
```bash
npx vitest watch src/store/__tests__/
```

### Run with coverage
```bash
npx vitest run --coverage
```

## 📝 Test Patterns

### Mock Setup Pattern

Each test file uses a common mock pattern for Zustand's `set` and `get`:

```typescript
const createMockSetGet = () => {
  let state: Partial<EditorStore & YourSlice> = {
    // Initial state here
  };

  const set = vi.fn((fn: any) => {
    if (typeof fn === 'function') {
      state = { ...state, ...fn(state) };
    } else {
      state = { ...state, ...fn };
    }
  });

  const get = vi.fn(() => ({
    ...state,
    // Add any cross-slice methods needed
    openTab: vi.fn(),
    addNotification: vi.fn(),
  }));

  return { set, get, getState: () => state };
};
```

### Test Structure Pattern

```typescript
describe('YourSlice', () => {
  let mockSetGet: ReturnType<typeof createMockSetGet>;

  beforeEach(() => {
    mockSetGet = createMockSetGet();
  });

  describe('Initial State', () => {
    it('should initialize with default value', () => {
      const slice = createYourSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & YourSlice);
      expect(slice.yourProperty).toBe(expectedValue);
    });
  });

  describe('yourAction', () => {
    it('should do something', () => {
      const slice = createYourSlice(mockSetGet.set, mockSetGet.get, {} as EditorStore & YourSlice);
      slice.yourAction(param);
      expect(mockSetGet.set).toHaveBeenCalled();
    });
  });
});
```

## ✅ Best Practices

1. **Test Initial State**: Always verify that the slice initializes with correct default values.

2. **Test Actions Individually**: Each action should have its own test case.

3. **Mock Dependencies**: When actions call other slice methods, mock them in the `get()` return value.

4. **Use Descriptive Names**: Test names should clearly describe what is being tested.

5. **Group Related Tests**: Use `describe` blocks to group related tests (Initial State, Actions, etc.).

6. **Test Edge Cases**: Include tests for edge cases like null values, empty arrays, etc.

7. **Keep Tests Independent**: Each test should be independent and not rely on other tests.

## 🔧 Configuration

Tests are configured in `vite.config.ts`:

```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
}
```

## 📦 Dependencies

- **Vitest**: Test runner
- **@testing-library/react**: React testing utilities
- **jsdom**: DOM simulation
- **@testing-library/jest-dom**: Custom matchers

## 🎯 Coverage Goals

Aim for:
- **80%+** statement coverage
- **90%+** branch coverage for critical paths
- **100%** coverage for utility functions

## 🚀 Next Steps

1. ✅ File Slice Tests - Complete
2. ✅ Editor Slice Tests - Complete
3. ✅ UI Slice Tests - Complete
4. ⏳ AI Slice Tests - TODO
5. ⏳ Terminal Slice Tests - TODO
6. ⏳ Integration Tests - TODO
7. ⏳ E2E Tests - TODO

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Zustand Testing](https://github.com/pmndrs/zustand#testing)
