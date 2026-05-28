# run-fare-newman-tests.ps1
# Runs Fare Estimation Service Newman tests in two stages.
# Stage 1 — normal flow: logs in, validates query params, tests direct service call, tests gateway forwarding.
# Stage 2 — service-down (optional): confirms the gateway returns 503 when fare-estimation-service is stopped.
#
# Prerequisites:
# - customer-service running on http://localhost:3001
# - gateway-service running on http://localhost:4000
# - fare-estimation-service running on http://localhost:3004
# - Newman installed globally: npm install -g newman

param(
    [switch]$RunFailure
)

$ErrorActionPreference = "Stop"

$PostmanDir   = ".\postman"
$EnvFile      = "$PostmanDir\cab-booking-local.postman_environment.json"
$TempEnvFile  = "$PostmanDir\.tmp-fare-newman-environment.json"

$FareCollection    = "$PostmanDir\cab-booking-fare-estimation-service.postman_collection.json"
$FailureCollection = "$PostmanDir\cab-booking-fare-failure.postman_collection.json"

Write-Host ""
Write-Host "Cab Booking - Fare Estimation Service Newman Tests" -ForegroundColor Cyan
Write-Host "Prerequisites: gateway-service :4000, customer-service :3001, fare-estimation-service :3004 running." -ForegroundColor Yellow
Write-Host ""

Write-Host "Running normal fare estimation flow tests..." -ForegroundColor Cyan

# Stage 1 — normal flow: login, validation checks, direct call, gateway call with and without token
newman run $FareCollection `
  -e $EnvFile `
  --export-environment $TempEnvFile `
  --reporters cli `
  --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Normal fare estimation tests failed. Fix errors before running the service-down test." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Normal fare estimation tests passed." -ForegroundColor Green

if (-not $RunFailure) {
    Write-Host ""
    $answer = Read-Host "Run service-down test? Stop fare-estimation-service first, then type Y. Otherwise press Enter"
    if ($answer -eq "Y" -or $answer -eq "y") {
        $RunFailure = $true
    }
}

if ($RunFailure) {
    Write-Host ""
    Write-Host "Running fare service-down test. fare-estimation-service must be stopped." -ForegroundColor Yellow

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
    Write-Host "Restart fare-estimation-service before continuing." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Fare estimation Newman workflow complete." -ForegroundColor Green
