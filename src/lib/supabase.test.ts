const { supabase } = require('./supabase');

async function testSupabaseConnection() {
    console.log('Testing Supabase connection...');
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
    console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');

    try {
        const { data, error } = await supabase
            .from('detainees')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Connection test failed:', error);
            return;
        }

        console.log('Connection successful!', data);
    } catch (error) {
        console.error('Connection test failed:', error);
    }
}

testSupabaseConnection();
