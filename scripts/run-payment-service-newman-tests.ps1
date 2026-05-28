# run-payment-service-newman-tests.ps1
# Runs Payment Service Newman tests in two stages.
# Stage 1 — normal flow: registers two users, creates bookings, tests auth enforcement,
#            input validation, wrong-owner rejection, valid payment, get-payment retrieval,
#            duplicate-payment rejection, and past-booking verification.
# Stage 2 — service-down (optional): confirms the gateway returns 503 when payment-service is stopped.
#
# Prerequisites:
# - customer-service running on http://localhost:3001
# - booking-service running on http://localhost:3002
# - fare-estimation-service running on http://localhost:3004
# - payment-service running on http://localhost:3003
# - gateway-service running on http://localhost:4000
# - Newman installed globally: npm install -g newman

param(
    [switch]$RunFailure
)

$ErrorActionPreference = "Stop"

$PostmanDir   = ".\postman"
$EnvFile      = "$PostmanDir\cab-booking-local.postman_environment.json"
$TempEnvFile  = "$PostmanDir\.tmp-payment-newman-environment.json"

$PaymentCollection = "$PostmanDir\cab-booking-payment-service.postman_collection.json"
$FailureCollection = "$PostmanDir\cab-booking-payment-failure.postman_collection.json"

Write-Host ""
Write-Host "Cab Booking - Payment Service Newman Tests" -ForegroundColor Cyan
Write-Host "Prerequisites: gateway-service :4000, customer-service :3001, booking-service :3002, fare-estimation-service :3004, payment-service :3003 running." -ForegroundColor Yellow
Write-Host ""

Write-Host "Running normal payment flow tests..." -ForegroundColor Cyan

# Stage 1 — normal flow: register users, create bookings, run all payment scenarios
newman run $PaymentCollection `
  -e $EnvFile `
  --export-environment $TempEnvFile `
  --reporters cli `
  --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Normal payment tests failed. Fix errors before running the service-down test." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Normal payment tests passed." -ForegroundColor Green

if (-not $RunFailure) {
    Write-Host ""
    $answer = Read-Host "Run service-down test? Stop payment-service first, then type Y. Otherwise press Enter"
    if ($answer -eq "Y" -or $answer -eq "y") {
        $RunFailure = $true
    }
}

if ($RunFailure) {
    Write-Host ""
    Write-Host "Running payment service-down test. payment-service must be stopped." -ForegroundColor Yellow

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
    Write-Host "Restart payment-service before continuing." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Payment Service Newman workflow complete." -ForegroundColor Green
