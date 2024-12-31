$SUPABASE_URL = "https://ycaoxydvlwltqqehdslg.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYW94eWR2bHdsdHFxZWhkc2xnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQyMTg1MjYsImV4cCI6MjA0OTc5NDUyNn0.T-0iZOXi5BXN2eHcUkv_bvlP_9y0VmwIuprQkQpaPoU"
$SESSION_ID = "bdda281e-0c9c-4ec5-90f1-c1c4a094b145"

$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "`n=== Checking Upload Session Status ===" -ForegroundColor Cyan
$sessionUrl = "$SUPABASE_URL/rest/v1/upload_sessions?id=eq.$SESSION_ID&select=*"
$session = Invoke-RestMethod -Uri $sessionUrl -Headers $headers -Method Get
$session | ConvertTo-Json -Depth 10

Write-Host "`n=== Checking CSV Upload Records ===" -ForegroundColor Cyan
$recordsUrl = "$SUPABASE_URL/rest/v1/csv_upload_records?session_id=eq.$SESSION_ID&select=*"
$records = Invoke-RestMethod -Uri $recordsUrl -Headers $headers -Method Get
Write-Host "Total Records Found: $($records.Count)"
if ($records.Count -gt 0) {
    $records | ConvertTo-Json -Depth 10
}

Write-Host "`n=== Checking Validation Feedback ===" -ForegroundColor Cyan
$feedbackUrl = "$SUPABASE_URL/rest/v1/validation_feedback?select=*"
$feedback = Invoke-RestMethod -Uri $feedbackUrl -Headers $headers -Method Get
if ($feedback.Count -gt 0) {
    $feedback | Where-Object { $records.id -contains $_.record_id } | ConvertTo-Json -Depth 10
} else {
    Write-Host "No validation feedback found"
}
