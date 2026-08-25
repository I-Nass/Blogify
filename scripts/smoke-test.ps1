# Blogify end-to-end smoke test (PowerShell 5.1 compatible)
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5000'
function ReadErr($e) { try { $sr = New-Object IO.StreamReader($e.Exception.Response.GetResponseStream()); $sr.ReadToEnd() } catch { '' } }

# --- unauthenticated write must be rejected with 401 ---
try {
    Invoke-RestMethod -Method Post -Uri "$base/api/posts" -ContentType 'application/json' -Body '{"title":"hack"}' | Out-Null
    Write-Output 'T5b FAIL: unauth write allowed'
} catch {
    Write-Output ("T5b OK rejected HTTP " + $_.Exception.Response.StatusCode.value__)
}

# --- wrong password must fail ---
try {
    Invoke-WebRequest "$base/admin/login" -Method Post -Body @{ username = 'admin'; password = 'wrong' } -UseBasicParsing | Out-Null
    Write-Output 'T6a FAIL: bad password accepted'
} catch {
    Write-Output ("T6a OK bad login HTTP " + $_.Exception.Response.StatusCode.value__ + " msgShown=" + ((ReadErr $_).Contains('Invalid username')))
}

# --- good login lands on dashboard ---
$null = Invoke-WebRequest "$base/admin/login" -UseBasicParsing -SessionVariable sess
$login = Invoke-WebRequest "$base/admin/login" -Method Post -Body @{ username = 'admin'; password = 'ChangeMe123!' } -WebSession $sess -UseBasicParsing
Write-Output ("T6b login landed on: " + $login.BaseResponse.ResponseUri.AbsolutePath)
$dash = Invoke-WebRequest "$base/admin" -WebSession $sess -UseBasicParsing
Write-Output ("T6c dashboard=" + $dash.StatusCode + " stats=" + $dash.Content.Contains('statCard') + " table=" + $dash.Content.Contains('postsTable'))
$newForm = Invoke-WebRequest "$base/admin/new" -WebSession $sess -UseBasicParsing
Write-Output ("T6d editor form complete=" + ($newForm.Content.Contains('article1') -and $newForm.Content.Contains('slugPreview')))

# --- create post through the admin UI ---
$null = Invoke-WebRequest "$base/admin/new" -Method Post -Body @{
    title     = 'Smoke Test Post'
    summary   = 'Temporary verification article'
    author    = 'admin'
    tags      = 'test, smoke'
    category  = 'general'
    article1  = "First paragraph here.`n`nSecond paragraph here."
    status    = 'published'
} -WebSession $sess -UseBasicParsing
Write-Output 'T7a created via admin form'

$api  = Invoke-RestMethod -Uri "$base/api/posts?limit=50"
$post = $api.posts | Where-Object { $_.title -eq 'Smoke Test Post' } | Select-Object -First 1
Write-Output ("T7b slug=" + $post.slug + " readTime=" + $post.readTime + " tags=" + ($post.tags -join '|') + " category=" + $post.category)

# --- public read by slug ---
$pub = Invoke-WebRequest "$base/read/$($post.slug)" -UseBasicParsing
Write-Output ("T8 read=" + $pub.StatusCode + " titleOK=" + $pub.Content.Contains('Smoke Test Post') + " paras=" + ([regex]::Matches($pub.Content, '<p>')).Count + " editLink=" + $pub.Content.Contains('/admin/edit/'))

# --- draft workflow ---
$drafted = Invoke-RestMethod -Method Patch -Uri "$base/api/posts/$($post._id)" -WebSession $sess -ContentType 'application/json' -Body '{"status":"draft"}'
Write-Output ("T9a patch->draft=" + $drafted.status)
try {
    Invoke-WebRequest "$base/read/$($post.slug)" -UseBasicParsing | Out-Null
    Write-Output 'T9b FAIL: draft visible to anon'
} catch {
    Write-Output ("T9b OK draft hidden from anon HTTP " + $_.Exception.Response.StatusCode.value__)
}
$me = Invoke-WebRequest "$base/read/$($post.slug)" -WebSession $sess -UseBasicParsing
Write-Output ("T9c draft preview for admin=" + $me.Content.Contains('Draft preview'))
Invoke-RestMethod -Method Patch -Uri "$base/api/posts/$($post._id)" -WebSession $sess -ContentType 'application/json' -Body '{"status":"published"}' | Out-Null

# --- delete via dashboard endpoint ---
$null = Invoke-WebRequest "$base/admin/delete/$($post._id)" -Method Post -WebSession $sess -UseBasicParsing
try {
    Invoke-WebRequest "$base/read/$($post.slug)" -UseBasicParsing | Out-Null
    Write-Output 'T10 FAIL: post still exists after delete'
} catch {
    Write-Output ("T10 OK deleted -> HTTP " + $_.Exception.Response.StatusCode.value__)
}

# --- unknown route gets branded 404 ---
try {
    Invoke-WebRequest "$base/no-such-page" -UseBasicParsing | Out-Null
    Write-Output 'T11 FAIL: no 404'
} catch {
    Write-Output ("T11 OK unknown route HTTP " + $_.Exception.Response.StatusCode.value__ + " branded=" + ((ReadErr $_).Contains('does not exist')))
}

Write-Output '=== SMOKE COMPLETE ==='
