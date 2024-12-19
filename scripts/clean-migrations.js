import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationsToDelete = [
    // Old search optimizations
    '20231215_optimize_search.sql',
    '20231218_optimize_search_v3.sql',
    '20231218_optimize_search_v3_1.sql',
    '20231218_optimize_search_v3_2.sql',
    '20231218_optimize_search_v3_3.sql',
    '20231218_optimize_search_v3_4.sql',
    '20231218_optimize_search_v3_4_1.sql',
    '20231218_optimize_search_v3_4_2.sql',
    '20231218_optimize_search_v3_4_3.sql',
    '20231218_optimize_search_v3_4_4.sql',
    '20231218_optimize_search_v3_4_5.sql',
    '20231218_optimize_search_v3_4_6.sql',
    '20231218_optimize_search_v3_4_7.sql',
    '20231218_optimize_search_v3_4_8.sql',
    '20231218_optimize_search_v3_4_9.sql',
    '20231218_optimize_search_v3_4_10.sql',
    '20231218_optimize_search_v3_4_11.sql',
    '20231218_optimize_search_v3_4_12.sql',
    '20231218_optimize_search_v3_5.sql',
    '20231218_optimize_search_v3_6.sql',
    // Old search fixes and updates
    '20241216_fix_full_text_search.sql',
    '20241216_optimize_indexes.sql',
    '20241216_search_optimization.sql',
    '20241217_update_search_mv.sql'
];

async function cleanMigrations() {
    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
    
    console.log('Starting migration cleanup...');
    console.log(`Migration directory: ${migrationsDir}`);
    
    try {
        // Get list of existing files
        const files = await fs.readdir(migrationsDir);
        
        // Track results
        const results = {
            deleted: [],
            notFound: [],
            errors: []
        };
        
        // Process each file
        for (const fileToDelete of migrationsToDelete) {
            try {
                if (files.includes(fileToDelete)) {
                    const filePath = join(migrationsDir, fileToDelete);
                    await fs.unlink(filePath);
                    results.deleted.push(fileToDelete);
                    console.log(`✓ Deleted: ${fileToDelete}`);
                } else {
                    results.notFound.push(fileToDelete);
                    console.log(`⚠ Not found: ${fileToDelete}`);
                }
            } catch (error) {
                results.errors.push({ file: fileToDelete, error: error.message });
                console.error(`✗ Error deleting ${fileToDelete}: ${error.message}`);
            }
        }
        
        // Print summary
        console.log('\nCleanup Summary:');
        console.log(`Successfully deleted: ${results.deleted.length} files`);
        console.log(`Not found: ${results.notFound.length} files`);
        console.log(`Errors: ${results.errors.length} files`);
        
        if (results.errors.length > 0) {
            console.log('\nErrors encountered:');
            results.errors.forEach(({ file, error }) => {
                console.log(`- ${file}: ${error}`);
            });
        }
        
    } catch (error) {
        console.error('Failed to read migrations directory:', error);
        process.exit(1);
    }
}

// Run the cleanup
cleanMigrations().catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1);
});
