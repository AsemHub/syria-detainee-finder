import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function submitDetainee(detainee) {
  try {
    // First check for duplicates
    const checkDuplicateResponse = await fetch('http://localhost:3000/api/check-duplicate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(detainee),
    });

    const duplicateData = await checkDuplicateResponse.json();
    
    if (!checkDuplicateResponse.ok) {
      throw new Error(`Duplicate check failed: ${duplicateData.error}`);
    }

    if (duplicateData.duplicates && duplicateData.duplicates.length > 0) {
      console.log(`Skipping submission for ${detainee.full_name} - duplicate found`);
      return false;
    }

    // Submit the detainee
    const submitResponse = await fetch('http://localhost:3000/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(detainee),
    });

    const submitData = await submitResponse.json();

    if (!submitResponse.ok) {
      throw new Error(`Submission failed: ${submitData.error}`);
    }

    console.log(`Successfully submitted: ${detainee.full_name}`);
    return true;
  } catch (error) {
    console.error(`Error submitting ${detainee.full_name}:`, error.message);
    return false;
  }
}

async function bulkSubmit() {
  try {
    // Read the test data file
    const testDataPath = join(__dirname, 'test-data.json');
    const testDataContent = await readFile(testDataPath, 'utf8');
    const testData = JSON.parse(testDataContent);
    
    console.log(`Starting bulk submission of ${testData.length} detainees...`);
    
    let successCount = 0;
    let failureCount = 0;

    for (const detainee of testData) {
      // Add a delay between submissions to prevent rate limiting
      await sleep(1000);
      
      const success = await submitDetainee(detainee);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    console.log('\nSubmission Summary:');
    console.log(`Total Attempted: ${testData.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
  } catch (error) {
    console.error('Error during bulk submission:', error);
  }
}

// Start the bulk submission
console.log('Starting test data submission...');
await bulkSubmit();
