# Supabase Deployment Guide

## Prerequisites

1. Supabase CLI installed
2. GitHub repository secrets configured:
   - `SUPABASE_ACCESS_TOKEN`: Your Supabase access token
   - `SUPABASE_DB_PASSWORD`: Your database password
   - `SUPABASE_PROJECT_ID`: Your Supabase project ID

## Manual Deployment

To deploy manually using the Supabase CLI:

```bash
# Link your project
supabase link --project-ref your-project-id

# Push database changes
supabase db push

# Deploy Edge Functions
supabase functions deploy search-detainees --no-verify-jwt
supabase functions deploy submit-detainee --no-verify-jwt
supabase functions deploy submit-documents --no-verify-jwt
```

## GitHub Actions Deployment

The project is configured to automatically deploy when changes are pushed to the main branch. The deployment includes:

1. Database migrations
2. Edge Functions:
   - search-detainees
   - submit-detainee
   - submit-documents

### Triggering a Manual Deployment

You can manually trigger the deployment workflow:

1. Go to the GitHub repository
2. Click on "Actions"
3. Select "Deploy Supabase" workflow
4. Click "Run workflow"

## Environment Variables

The following environment variables are required for deployment:

```env
SUPABASE_ACCESS_TOKEN=your_access_token
SUPABASE_DB_PASSWORD=your_db_password
SUPABASE_PROJECT_ID=your_project_id
```

## Deployment Process

1. The GitHub Action workflow is triggered on:
   - Push to main branch (when changes are made to /supabase directory)
   - Manual workflow dispatch

2. The workflow:
   - Sets up Supabase CLI
   - Links to your Supabase project
   - Deploys database migrations
   - Deploys Edge Functions

3. After deployment:
   - Database changes are applied
   - Edge Functions are updated
   - Functions are accessible via their URLs:
     - `https://<project-ref>.functions.supabase.co/search-detainees`
     - `https://<project-ref>.functions.supabase.co/submit-detainee`
     - `https://<project-ref>.functions.supabase.co/submit-documents`

## Monitoring Deployments

1. Check GitHub Actions tab for deployment status and logs
2. Verify in Supabase Dashboard:
   - Database > Migration history
   - Edge Functions > Deployed functions

## Troubleshooting

If deployment fails:

1. Check GitHub Actions logs for errors
2. Verify environment variables are set correctly
3. Ensure database migrations are valid
4. Check Edge Functions for syntax errors
5. Verify Supabase CLI access and permissions
