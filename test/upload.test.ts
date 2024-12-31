import { describe, it, expect } from '@jest/globals';
import { normalizeNameForDb, parseDate, cleanupText } from '../src/lib/validation';

describe('CSV Upload Validation', () => {
  describe('normalizeNameForDb', () => {
    it('should normalize Arabic names correctly', () => {
      expect(normalizeNameForDb('محمّد أحمد')).toBe('محمد احمد');
      expect(normalizeNameForDb('زينب محمّد')).toBe('زينب محمد');
      expect(normalizeNameForDb('عُمر حسن')).toBe('عمر حسن');
    });
  });

  describe('parseDate', () => {
    it('should parse various date formats', () => {
      expect(parseDate('2012-03-15')).toBe('2012-03-15');
      expect(parseDate('15-03-2012')).toBe('2012-03-15');
      expect(parseDate('15/03/2012')).toBe('2012-03-15');
      expect(parseDate('15 آذار 2012')).toBe('2012-03-15');
    });
  });

  describe('cleanupText', () => {
    it('should clean up Arabic text correctly', () => {
      expect(cleanupText('دمشق  ')).toBe('دمشق');
      expect(cleanupText('حلب\n')).toBe('حلب');
      expect(cleanupText('  حمص  ')).toBe('حمص');
    });
  });
});
