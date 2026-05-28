// bookings.js
// Booking API calls and DOM rendering helpers.
// Loaded on bookings.html (and passively on dashboard.html).
'use strict';

// Converts ISO string to a human-readable local date/time.
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Returns a Bootstrap badge element matching the booking status.
function statusBadge(status) {
  const map = { current: 'primary', completed: 'success', cancelled: 'secondary' };
  const cls = map[status] || 'dark';
  return `<span class="badge bg-${cls} text-capitalize">${status}</span>`;
}

// Empty-state row
function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" class="text-center text-muted py-3">${msg}</td></tr>`;
}

// Load current bookings
// Fetches status='current' bookings and renders them into #current-tbody.
async function loadCurrentBookings() {
  const tbody = document.getElementById('current-tbody');
  if (!tbody) return;

  try {
    const res  = await fetch(`${GATEWAY_URL}/api/bookings/current`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      tbody.innerHTML = emptyRow(6, data.error || 'Failed to load bookings.');
      return;
    }

    if (!data.length) {
      tbody.innerHTML = emptyRow(6, 'No current bookings.');
      return;
    }

    // Render one row per booking; cancel button triggers cancelBooking()
    tbody.innerHTML = data.map(b => `
      <tr>
        <td>${b.start_location}</td>
        <td>${b.end_location}</td>
        <td>${formatDate(b.booking_datetime)}</td>
        <td>${b.cab_type}</td>
        <td class="text-center">${b.passengers}</td>
        <td>
          ${statusBadge(b.status)}
          <button class="btn btn-sm btn-outline-danger ms-2"
                  onclick="cancelBooking('${b.id}')">Cancel</button>
        </td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = emptyRow(6, 'Cannot reach the server.');
  }
}

// Load past bookings
// Fetches completed/cancelled bookings and renders them into #past-tbody.
async function loadPastBookings() {
  const tbody = document.getElementById('past-tbody');
  if (!tbody) return;

  try {
    const res  = await fetch(`${GATEWAY_URL}/api/bookings/past`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      tbody.innerHTML = emptyRow(6, data.error || 'Failed to load bookings.');
      return;
    }

    if (!data.length) {
      tbody.innerHTML = emptyRow(6, 'No past bookings.');
      return;
    }

    // Render one row per booking; completed bookings show a Pay link
    tbody.innerHTML = data.map(b => `
      <tr>
        <td>${b.start_location}</td>
        <td>${b.end_location}</td>
        <td>${formatDate(b.booking_datetime)}</td>
        <td>${b.cab_type}</td>
        <td class="text-center">${b.passengers}</td>
        <td>
          ${statusBadge(b.status)}
          ${b.status === 'completed'
            ? `<a href="payment.html?id=${b.id}" class="btn btn-sm btn-outline-success ms-2">Pay</a>`
            : ''}
        </td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = emptyRow(6, 'Cannot reach the server.');
  }
}

// Create a booking
// POSTs a new booking payload; returns the raw fetch Response for the caller to handle.
async function createBooking(payload) {
  return fetch(`${GATEWAY_URL}/api/bookings`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(payload)
  });
}

// Cancel a booking
// PATCHes status to 'cancelled', then refreshes both booking tables.
async function cancelBooking(id) {
  if (!confirm('Cancel this booking?')) return;

  try {
    const res = await fetch(`${GATEWAY_URL}/api/bookings/${id}/status`, {
      method:  'PATCH',
      headers: authHeaders(),
      body:    JSON.stringify({ status: 'cancelled' })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Could not cancel booking.');
      return;
    }

    // Refresh both tables after a successful cancel
    await loadCurrentBookings();
    await loadPastBookings();
  } catch {
    alert('Cannot reach the server.');
  }
}
