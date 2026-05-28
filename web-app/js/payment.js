// payment.js
// Payment API calls and result rendering helpers.
// Loaded on payment.html.
'use strict';

// Render calculation breakdown
// Converts the JSONB breakdown object into a Bootstrap table for demo evidence.
function renderBreakdown(breakdown) {
  if (!breakdown || typeof breakdown !== 'object') {
    return '<p class="text-muted mb-0">No breakdown available.</p>';
  }
  const rows = Object.entries(breakdown)
    .map(([k, v]) =>
      `<tr>
        <td class="text-muted text-capitalize">${k.replace(/_/g, ' ')}</td>
        <td class="fw-semibold text-end">${v}</td>
      </tr>`)
    .join('');
  return `<table class="table table-sm table-borderless mb-0">${rows}</table>`;
}

// Render a full payment summary into #payment-summary
// Called after a successful POST or when an existing payment is found.
function renderPaymentSummary(payment) {
  const summary = document.getElementById('payment-summary');
  if (!summary) return;

  summary.innerHTML = `
    <div class="card border-success shadow-sm">
      <div class="card-header bg-success text-white fw-semibold">Payment Confirmed</div>
      <div class="card-body">
        <p class="mb-1">
          <span class="text-muted">Booking ID:</span>
          <code class="user-select-all">${payment.booking_id}</code>
        </p>
        <p class="mb-3">
          <span class="text-muted">Total paid:</span>
          <span class="fs-5 fw-bold text-success ms-1">€${Number(payment.total_price).toFixed(2)}</span>
        </p>
        <h6 class="text-muted mb-1">Calculation Breakdown</h6>
        ${renderBreakdown(payment.calculation_breakdown)}
      </div>
    </div>`;
  summary.classList.remove('d-none');
}

// Fetch an existing payment by booking ID
// Returns the payment object if already paid, null on 404, throws on other errors.
async function loadPayment(bookingId) {
  const res = await fetch(`${GATEWAY_URL}/api/payments/${bookingId}`, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error || 'Failed to load payment.');
  }
  return res.json();
}

// Submit a new payment
// Returns the raw fetch Response for the caller to handle.
async function submitPayment(bookingId) {
  return fetch(`${GATEWAY_URL}/api/payments`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ booking_id: bookingId })
  });
}
