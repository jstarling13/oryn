# Finds the Stripe CLI and starts the local webhook listener.
# Called by: npm run stripe:listen

$stripe = (Get-Command stripe -ErrorAction SilentlyContinue)?.Source
if (-not $stripe) {
    # Common install locations on Windows
    $candidates = @(
        "$env:USERPROFILE\stripe.exe",
        "$env:LOCALAPPDATA\Programs\stripe\stripe.exe",
        "C:\Program Files\stripe\stripe.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $stripe = $c; break }
    }
}

if (-not $stripe) {
    Write-Error "Stripe CLI not found. Download from https://stripe.com/docs/stripe-cli"
    exit 1
}

Write-Host "Using Stripe CLI: $stripe"
Write-Host "Starting local webhook listener → http://localhost:3000/api/webhooks/stripe"
Write-Host ""
& $stripe listen --forward-to localhost:3000/api/webhooks/stripe
