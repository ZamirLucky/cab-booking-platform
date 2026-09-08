// Payment helpers
'use strict';

// Breakdown rendering
function renderBreakdown(breakdown) {
  if (!breakdown || typeof breakdown !== 'object') {
    return '<p class="text-muted mb-0">No breakdown available.</p>';
  }
  const rows = Object.entries(breakdown)
    .map(([k, v]) => {
      // Total styling
      const isTotal = /total|price/i.test(k);
      return `<tr class="${isTotal ? 'breakdown-total' : ''}">
        <td class="text-muted text-capitalize">${k.replace(/_/g, ' ')}</td>
        <td class="text-end">${v}</td>
      </tr>`;
    })
    .join('');
  return `<table class="table table-sm table-borderless mb-0">${rows}</table>`;
}

// Payment summary
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

// Payment lookup
async function loadPayment(bookingId) {
  const res = await fetch(`${GATEWAY_URL}/api/payments/${bookingId}`, { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error || 'Failed to load payment.');
  }
  return res.json();
}

// Payment submission
async function submitPayment(bookingId) {
  return fetch(`${GATEWAY_URL}/api/payments`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ booking_id: bookingId })
  });
}
