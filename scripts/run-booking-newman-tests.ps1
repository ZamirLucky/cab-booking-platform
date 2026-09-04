# run-booking-newman-tests.ps1
# Runs Booking Service Newman tests in up to four stages.
# Stage 1 — normal flow: registers a test user, creates bookings, checks status, and verifies event trigger points.
# Stage 2 — service-down (optional): confirms the gateway returns 503 when booking-service is stopped.
# Stage 3 — cab-ready event (optional): creates a booking and waits 190 seconds for the delayed notification.
# Stage 4 — discount event (optional): completes 4 booking cycles and verifies exactly 1 discount notification.
#
# Prerequisites:
# - customer-service running on http://localhost:3001
# - booking-service running on http://localhost:3002
# - gateway-service running on http://localhost:4000
# - Newman installed globally: npm install -g newman

param(
    [switch]$RunFailure,
    [switch]$RunCabReady,
    [switch]$RunDiscount
)

$ErrorActionPreference = "Stop"

$PostmanDir = ".\postman"
$EnvFile    = "$PostmanDir\cab-booking-local.postman_environment.json"
$TempEnvFile = "$PostmanDir\.tmp-booking-newman-environment.json"

$BookingCollection  = "$PostmanDir\cab-booking-booking-service.postman_collection.json"
$FailureCollection  = "$PostmanDir\cab-booking-booking-failure.postman_collection.json"
$CabReadyCollection = "$PostmanDir\cab-booking-cab-ready-event.postman_collection.json"
$DiscountCollection = "$PostmanDir\cab-booking-discount-event.postman_collection.json"

Write-Host ""
Write-Host "Cab Booking - Booking Service Newman Tests" -ForegroundColor Cyan
Write-Host "Prerequisites: gateway-service :4000, customer-service :3001, booking-service :3002 running." -ForegroundColor Yellow
Write-Host ""

Write-Host "Running normal booking flow tests..." -ForegroundColor Cyan

# Stage 1 — normal flow: folder 00 registers/logs in and saves {{token}}; folder 01 runs all booking requests
newman run $BookingCollection `
  -e $EnvFile `
  --export-environment $TempEnvFile `
  --reporters cli `
  --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Normal booking flow failed. Fix errors before running optional stages." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Normal booking flow passed." -ForegroundColor Green

# Stage 2 — service-down
if (-not $RunFailure) {
    Write-Host ""
    $answer = Read-Host "Run service-down test? Stop booking-service first, then type Y. Otherwise press Enter"
    if ($answer -eq "Y" -or $answer -eq "y") {
        $RunFailure = $true
    }
}

if ($RunFailure) {
    Write-Host ""
    Write-Host "Running booking service-down test. booking-service must be stopped." -ForegroundColor Yellow

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
    Write-Host "Restart booking-service before continuing." -ForegroundColor Yellow
}

# Stage 3 — cab-ready event
if (-not $RunCabReady) {
    Write-Host ""
    $answer = Read-Host "Run cab-ready event test? booking-service must be running. Type Y to run (waits 190s). Otherwise press Enter"
    if ($answer -eq "Y" -or $answer -eq "y") {
        $RunCabReady = $true
    }
}

if ($RunCabReady) {
    Write-Host ""
    Write-Host "Running cab-ready event setup..." -ForegroundColor Cyan

    # Stage 3a — create the booking that triggers the booking.created event
    newman run $CabReadyCollection `
      -e $TempEnvFile `
      --folder "Create Booking For Cab Ready Event" `
      --export-environment $TempEnvFile `
      --reporters cli `
      --verbose

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Cab-ready setup failed." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    # Stage 3b — wait for the 3-minute setTimeout in bookingEvents.js to fire
    Write-Host ""
    Write-Host "Waiting 190 seconds for booking.created event to fire cab_ready notification..." -ForegroundColor Yellow
    Start-Sleep -Seconds 190

    Write-Host ""
    Write-Host "Checking cab-ready notification..." -ForegroundColor Cyan

    newman run $CabReadyCollection `
      -e $TempEnvFile `
      --folder "Check Cab Ready Notification" `
      --reporters cli `
      --verbose

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Cab-ready notification test failed." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host "Cab-ready event test passed." -ForegroundColor Green
}

# Stage 4 — discount event
if (-not $RunDiscount) {
    Write-Host ""
    $answer = Read-Host "Run discount event test? Registers a fresh user and completes 4 bookings. Type Y to run. Otherwise press Enter"
    if ($answer -eq "Y" -or $answer -eq "y") {
        $RunDiscount = $true
    }
}

if ($RunDiscount) {
    Write-Host ""
    Write-Host "Running discount event test (11 requests across 4 booking cycles)..." -ForegroundColor Cyan

    # Stage 4 — discount: registers its own fresh user so it is independent of previous stages
    newman run $DiscountCollection `
      -e $EnvFile `
      --reporters cli `
      --verbose

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Discount event test failed." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host "Discount event test passed." -ForegroundColor Green
}

Write-Host ""
Write-Host "Booking Newman workflow complete." -ForegroundColor Green
