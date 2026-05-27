# run-gateway-newman-tests.ps1
# Runs Gateway customer-forwarding Newman tests in two stages.
# Stage 1 — normal flow: registers a test user, logs in, and tests all five gateway customer routes.
# Stage 2 — service-down: confirms the gateway returns 503 when customer-service is stopped.
#
# Prerequisites:
# - customer-service running on http://localhost:3001
# - gateway-service running on http://localhost:4000
# - Newman installed globally: npm install -g newman

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PostmanDir = Join-Path $ProjectRoot "postman"
$TmpEnv = Join-Path $PostmanDir ".tmp-cab-booking-local.postman_environment.json"

$GatewayCollection = Join-Path $PostmanDir "cab-booking-gateway-customer-forwarding.postman_collection.json"
$FailureCollection = Join-Path $PostmanDir "cab-booking-gateway-failure.postman_collection.json"
$Environment = Join-Path $PostmanDir "cab-booking-local.postman_environment.json"

Write-Host ""
Write-Host "Running normal Gateway forwarding tests..." -ForegroundColor Cyan

# Stage 1 — normal flow: export environment so token is available for stage 2
newman run $GatewayCollection `
  -e $Environment `
  --export-environment $TmpEnv `
  --reporters cli `
  --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host "Normal Gateway tests failed. Fix these before running the service-down test." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Normal Gateway tests passed." -ForegroundColor Green
Write-Host ""
Write-Host "To run the service-down test:" -ForegroundColor Yellow
Write-Host "1. Stop customer-service only."
Write-Host "2. Keep gateway-service running."
Write-Host "3. Type Y and press Enter."
Write-Host ""

$answer = Read-Host "Run service-down test now? (Y/N)"

if ($answer -eq "Y" -or $answer -eq "y") {
    Write-Host ""
    Write-Host "Running Gateway service-down test..." -ForegroundColor Cyan

    # Stage 2 — service-down: uses exported environment from stage 1 (token already set)
    newman run $FailureCollection `
      -e $TmpEnv `
      --reporters cli `
      --verbose

    exit $LASTEXITCODE
}

Write-Host "Skipped service-down test." -ForegroundColor Yellow
exit 0
