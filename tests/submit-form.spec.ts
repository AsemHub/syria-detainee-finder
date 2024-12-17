import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Increase timeout for all tests
test.setTimeout(60000);

test.describe('Detainee Submission Form', () => {
  let testData: any[];

  test.beforeAll(() => {
    // Load test data
    const testDataPath = join(__dirname, '../scripts/test-data.json');
    console.log('Loading test data from:', testDataPath);
    try {
      const testDataContent = readFileSync(testDataPath, 'utf8');
      testData = JSON.parse(testDataContent);
      console.log('Successfully loaded test data');
    } catch (error) {
      console.error('Error loading test data:', error);
      throw error;
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the page and wait for it to be ready
    await page.goto('/submit');
    await page.waitForLoadState('networkidle');
  });

  test('should submit a valid detainee record to production', async ({ page }) => {
    // Generate a unique name using timestamp in a letter format
    const timestamp = new Date().getTime();
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const uniqueName = `Test User ${letters[timestamp % 26]}${letters[(timestamp + 1) % 26]}${letters[(timestamp + 2) % 26]}`;
    
    // Fill in the form with test data
    await page.getByLabel('Full Name').fill(uniqueName);
    await page.getByLabel('Last Seen Location').fill('Damascus Test Location');
    
    // Select gender
    await page.getByLabel('Gender').click();
    await page.getByRole('option', { name: 'Male', exact: true }).click();

    // Select status
    await page.getByLabel('Current Status').click();
    await page.getByRole('option', { name: 'Missing', exact: true }).click();

    await page.getByLabel('Contact Information').fill('test@example.com');
    await page.getByLabel('Additional Notes').fill('Automated test submission');

    // Submit the form and wait for response
    const [response] = await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/submit') && response.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Submit', exact: true }).click()
    ]);

    const responseData = await response.json();
    
    // Verify response
    expect(response.ok()).toBe(true);
    expect(responseData.message).toContain('success');

    // Wait for success indicator in the UI
    await expect(page.getByText(/success/i, { timeout: 10000 })).toBeVisible();
  });

  test('should prevent duplicate submissions', async ({ page }) => {
    // Use a fixed name that we know exists in the database
    const existingName = 'John Smith Test';
    
    // Fill in the form with duplicate data
    await page.getByLabel('Full Name').fill(existingName);
    await page.getByLabel('Last Seen Location').fill('Damascus');
    
    // Select gender
    await page.getByLabel('Gender').click();
    await page.getByRole('option', { name: 'Male', exact: true }).click();

    // Select status
    await page.getByLabel('Current Status').click();
    await page.getByRole('option', { name: 'Missing', exact: true }).click();

    await page.getByLabel('Contact Information').fill('test@example.com');

    // Submit the form and wait for duplicate check response
    const [duplicateResponse] = await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/check-duplicate') && response.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Submit', exact: true }).click()
    ]);

    // Wait for the duplicate warning dialog
    await expect(page.getByRole('dialog', { timeout: 10000 })).toBeVisible();
    await expect(page.getByText(/similar|matching/i, { timeout: 10000 })).toBeVisible();
  });

  test('should handle validation errors', async ({ page }) => {
    // Click submit without filling required fields
    await page.getByRole('button', { name: 'Submit', exact: true }).click();

    // Check for validation error messages
    await expect(page.getByText(/name.*2 characters/i)).toBeVisible();
    await expect(page.getByText(/location.*2 characters/i)).toBeVisible();
    await expect(page.getByText(/contact.*required/i)).toBeVisible();
  });

  test('should handle rate limit errors', async ({ page }) => {
    // Submit multiple times quickly to trigger rate limit
    for (let i = 0; i < 6; i++) {
      const timestamp = new Date().getTime();
      const letters = 'abcdefghijklmnopqrstuvwxyz';
      const uniqueName = `Test User ${letters[timestamp % 26]}${letters[(timestamp + 1) % 26]}${letters[(timestamp + 2) % 26]}`;
      
      await page.getByLabel('Full Name').fill(uniqueName);
      await page.getByLabel('Last Seen Location').fill('Damascus');
      await page.getByLabel('Gender').click();
      await page.getByRole('option', { name: 'Male', exact: true }).click();
      await page.getByLabel('Current Status').click();
      await page.getByRole('option', { name: 'Missing', exact: true }).click();
      await page.getByLabel('Contact Information').fill('test@example.com');

      // Submit the form and wait for response
      const [response] = await Promise.all([
        page.waitForResponse(
          response => response.url().includes('/api/submit') && response.request().method() === 'POST'
        ),
        page.getByRole('button', { name: 'Submit', exact: true }).click()
      ]);

      if (i === 5) {
        // The 6th request should be rate limited
        expect(response.status()).toBe(429);
        const responseData = await response.json();
        expect(responseData.error).toContain('Too many submissions');
        
        // Wait for rate limit error in UI
        await expect(page.getByText(/too many submissions/i, { timeout: 10000 })).toBeVisible();
      }

      // Wait a bit between submissions
      await page.waitForTimeout(100);
    }
  });
});
