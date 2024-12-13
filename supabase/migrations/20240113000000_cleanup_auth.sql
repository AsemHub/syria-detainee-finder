-- Drop existing policies
DROP POLICY IF EXISTS "Role-based read access" ON detainees;
DROP POLICY IF EXISTS "Role-based write access" ON detainees;
DROP POLICY IF EXISTS "Allow authenticated document creation" ON documents;
DROP POLICY IF EXISTS "Public can view verified documents" ON documents;
DROP POLICY IF EXISTS "Staff can manage documents" ON documents;
DROP POLICY IF EXISTS "Users can read own documents" ON documents;
DROP POLICY IF EXISTS "Verifiers can delete documents" ON documents;
DROP POLICY IF EXISTS "Verifiers can read all documents" ON documents;
DROP POLICY IF EXISTS "Verifiers can update documents" ON documents;

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_detainees_updated_at ON detainees;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing tables (in correct order to handle dependencies)
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS detainees CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- Drop existing functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS user_role CASCADE;
