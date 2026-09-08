// Booking helpers
'use strict';

// Date formatting
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Status styling
function statusBadge(status) {
  const map = { current: 'primary', completed: 'success', cancelled: 'secondary' };
  const cls = map[status] || 'dark';
  return `<span class="badge bg-${cls} text-capitalize">${status}</span>`;
}

// Empty state
function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" class="text-center text-muted py-3">${msg}</td></tr>`;
}

// Current bookings
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

    // Row actions
    tbody.innerHTML = data.map(b => `
      <tr>
        <td>${b.start_location}</td>
        <td>${b.end_location}</td>
        <td>${formatDate(b.booking_datetime)}</td>
        <td>${b.cab_type}</td>
        <td class="text-center">${b.passengers}</td>
        <td>
          ${statusBadge(b.status)}
          <a href="payment.html?id=${b.id}" class="btn btn-sm btn-success ms-1">Pay</a>
          <button class="btn btn-sm btn-outline-danger ms-1"
                  onclick="cancelBooking('${b.id}')">Cancel</button>
        </td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = emptyRow(6, 'Cannot reach the server.');
  }
}

// Past bookings
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

    // Read-only rows
    tbody.innerHTML = data.map(b => `
      <tr>
        <td>${b.start_location}</td>
        <td>${b.end_location}</td>
        <td>${formatDate(b.booking_datetime)}</td>
        <td>${b.cab_type}</td>
        <td class="text-center">${b.passengers}</td>
        <td>${statusBadge(b.status)}</td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = emptyRow(6, 'Cannot reach the server.');
  }
}

// Booking creation
async function createBooking(payload) {
  return fetch(`${GATEWAY_URL}/api/bookings`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(payload)
  });
}

// Booking cancellation
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

    // Refresh
    await loadCurrentBookings();
    await loadPastBookings();
  } catch {
    alert('Cannot reach the server.');
  }
}
