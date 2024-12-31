import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Mock dayjs for consistent date handling in tests
jest.mock('dayjs', () => {
  const mockDayjs = (date: string, format?: string) => ({
    isValid: () => true,
    format: () => '2012-03-15' // Return a fixed date for testing
  });
  
  mockDayjs.extend = () => {}; // No-op function
  
  return mockDayjs;
});
