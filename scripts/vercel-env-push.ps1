# Push all environment variables to Vercel project.
# Run this AFTER `vercel login` and `vercel link`.
# Usage: pwsh scripts/vercel-env-push.ps1 [--production]
#
# For production deploy, pass --production flag.
# For preview/development, run without flags (sets all environments).

param([switch]$Production)

$env_file = Join-Path $PSScriptRoot "..\\.env.local"
if (-not (Test-Path $env_file)) {
    Write-Error ".env.local not found at $env_file"
    exit 1
}

# Determine environments to target
$targets = if ($Production) { @("production") } else { @("production", "preview", "development") }

Write-Host "Reading .env.local..."
$lines = Get-Content $env_file

# Override NEXT_PUBLIC_APP_URL for production
$productionUrl = $null
if ($Production) {
    $productionUrl = Read-Host "Enter your Vercel production URL (e.g. https://oryn.vercel.app)"
}

foreach ($line in $lines) {
    # Skip comments and blank lines
    if ($line -match "^\s*#" -or $line -match "^\s*$") { continue }

    # Parse KEY=VALUE (handle quoted values)
    if ($line -match "^([^=]+)=(.*)$") {
        $key = $Matches[1].Trim()
        $val = $Matches[2].Trim().Trim("'").Trim('"')

        # Skip empty values
        if ([string]::IsNullOrWhiteSpace($val)) {
            Write-Host "  Skipping $key (empty)"
            continue
        }

        # Override app URL for production
        if ($key -eq "NEXT_PUBLIC_APP_URL" -and $productionUrl) {
            $val = $productionUrl
        }

        foreach ($target in $targets) {
            Write-Host "  Setting $key [$target]..."
            echo $val | vercel env add $key $target --force 2>$null
        }
    }
}

Write-Host ""
Write-Host "Done! Run 'vercel deploy --prod' to deploy."
Write-Host "Don't forget to create a Stripe webhook endpoint:"
Write-Host "  https://dashboard.stripe.com/webhooks -> Add endpoint"
Write-Host "  URL: https://YOUR_VERCEL_URL/api/webhooks/stripe"
Write-Host "  Events: customer.subscription.* + invoice.payment_*"
