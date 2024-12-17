const jestDom = require('@testing-library/jest-dom');
require('whatwg-fetch');
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {
    this.cb([{ borderBoxSize: [{ inlineSize: 0, blockSize: 0 }] }]);
  }
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ycaoxydvlwltqqehdslg.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYW94eWR2bHdsdHFxZWhkc2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQyMTg1MjYsImV4cCI6MjA0OTc5NDUyNn0.T-0iZOXi5BXN2eHcUkv_bvlP_9y0VmwIuprQkQpaPoU';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYW94eWR2bHdsdHFxZWhkc2xnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDI';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock window.requestAnimationFrame
window.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));

// Mock window.cancelAnimationFrame
window.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock window.getComputedStyle
window.getComputedStyle = jest.fn(() => ({
  getPropertyValue: jest.fn(),
}));

// Mock window.HTMLElement.prototype.scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock window.Element.prototype.getBoundingClientRect
window.Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 120,
  height: 120,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  x: 0,
  y: 0,
  toJSON: () => {},
}));

// Mock window.Element.prototype.getClientRects
window.Element.prototype.getClientRects = jest.fn(() => ({
  item: () => null,
  length: 0,
  [Symbol.iterator]: jest.fn(),
}));

// Mock window.Element.prototype.scrollTo
window.Element.prototype.scrollTo = jest.fn();

// Mock window.Element.prototype.scrollBy
window.Element.prototype.scrollBy = jest.fn();

// Mock window.Element.prototype.scrollIntoView
window.Element.prototype.scrollIntoView = jest.fn();

// Mock window.Element.prototype.focus
window.Element.prototype.focus = jest.fn();

// Mock window.Element.prototype.blur
window.Element.prototype.blur = jest.fn();

// Mock window.Element.prototype.select
window.Element.prototype.select = jest.fn();

// Mock window.Element.prototype.click
window.Element.prototype.click = jest.fn();

// Mock window.Element.prototype.submit
window.Element.prototype.submit = jest.fn();

// Mock window.Element.prototype.reset
window.Element.prototype.reset = jest.fn();

// Mock window.Element.prototype.checkValidity
window.Element.prototype.checkValidity = jest.fn(() => true);

// Mock window.Element.prototype.reportValidity
window.Element.prototype.reportValidity = jest.fn(() => true);

// Mock window.Element.prototype.setCustomValidity
window.Element.prototype.setCustomValidity = jest.fn();

// Mock window.Element.prototype.validity
Object.defineProperty(window.Element.prototype, 'validity', {
  get: jest.fn(() => ({
    badInput: false,
    customError: false,
    patternMismatch: false,
    rangeOverflow: false,
    rangeUnderflow: false,
    stepMismatch: false,
    tooLong: false,
    tooShort: false,
    typeMismatch: false,
    valid: true,
    valueMissing: false,
  })),
});

// Mock window.Element.prototype.validationMessage
Object.defineProperty(window.Element.prototype, 'validationMessage', {
  get: jest.fn(() => ''),
});

// Mock window.Element.prototype.willValidate
Object.defineProperty(window.Element.prototype, 'willValidate', {
  get: jest.fn(() => true),
});

// Mock window.Element.prototype.setSelectionRange
window.Element.prototype.setSelectionRange = jest.fn();

// Mock window.Element.prototype.select
window.Element.prototype.select = jest.fn();

// Mock window.Element.prototype.selectionStart
Object.defineProperty(window.Element.prototype, 'selectionStart', {
  get: jest.fn(() => 0),
  set: jest.fn(),
});

// Mock window.Element.prototype.selectionEnd
Object.defineProperty(window.Element.prototype, 'selectionEnd', {
  get: jest.fn(() => 0),
  set: jest.fn(),
});

// Mock window.Element.prototype.selectionDirection
Object.defineProperty(window.Element.prototype, 'selectionDirection', {
  get: jest.fn(() => 'none'),
  set: jest.fn(),
});

// Mock fetch globally
global.fetch = jest.fn();

// Set test timeout
jest.setTimeout(30000); // 30 seconds
