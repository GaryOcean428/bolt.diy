// Jest setup file
import '@testing-library/jest-dom';

// Mock import.meta.env for all tests
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_LOG_LEVEL: 'debug',
        DEV: true,
        SSR: false,
        NODE_ENV: 'test',
      },
    },
  },
  writable: true,
});

// Mock console methods to reduce noise in tests unless explicitly testing them
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  // Restore console methods after each test
  console.error = originalError;
  console.warn = originalWarn;
});
