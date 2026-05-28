# run-location-service-newman-tests.ps1
# Runs Location Service Newman tests in two stages.
# Stage 1 — normal flow: registers a user, tests auth enforcement, input validation,
#            adds two locations, lists, updates a label, fetches live weather, deletes
#            one location, and verifies the list shrinks to one item.
# Stage 2 — service-down (optional): confirms the gateway returns 503 when location-service is stopped.
#
# Prerequisites:
# - customer-service running on http://localhost:3001
# - location-service running on http://localhost:3005
# - gateway-service running on http://localhost:4000
# - Newman installed globally: npm install -g newman

param(
    [switch]$RunFailure
)

$ErrorActionPreference = "Stop"

$PostmanDir   = ".\postman"
$EnvFile      = "$PostmanDir\cab-booking-local.postman_environment.json"
$TempEnvFile  = "$PostmanDir\.tmp-location-newman-environment.json"

$LocationCollection = "$PostmanDir\cab-booking-location-service.postman_collection.json"
$FailureCollection  = "$PostmanDir\cab-booking-location-failure.postman_collection.json"

Write-Host ""
Write-Host "Cab Booking - Location Service Newman Tests" -ForegroundColor Cyan
Write-Host "Prerequisites: gateway-service :4000, customer-service :3001, location-service :3005 running." -ForegroundColor Yellow
Write-Host ""

Write-Host "Running normal location service flow tests..." -ForegroundColor Cyan

# Stage 1 — normal flow: register user, run all location scenarios
newman run $LocationCollection `
  -e $EnvFile `
  --export-environment $TempEnvFile `
  --reporters cli `
  --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Normal location tests failed. Fix errors before running the service-down test." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Normal location tests passed." -ForegroundColor Green

if (-not $RunFailure) {
    Write-Host ""
    $answer = Read-Host "Run service-down test? Stop location-service first, then type Y. Otherwise press Enter"
    if ($answer -eq "Y" -or $answer -eq "y") {
        $RunFailure = $true
    }
}

if ($RunFailure) {
    Write-Host ""
    Write-Host "Running location service-down test. location-service must be stopped." -ForegroundColor Yellow

    # Stage 2 — service-down: uses exported environment from stage 1 so token is already set
    newman run $FailureCollection `
      -e $TempEnvFile `
      --reporters cli `
      --verbose

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Service-down test failed." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host "Service-down test passed." -ForegroundColor Green
    Write-Host "Restart location-service before continuing." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Location Service Newman workflow complete." -ForegroundColor Green
