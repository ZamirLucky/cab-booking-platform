// locations.js
// Favourite location API calls and list rendering helpers.
// Loaded on locations.html.
'use strict';

// Escape helpers (prevent XSS in innerHTML / data attributes)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Load all favourite locations
// Fetches the user's saved locations and renders them into #locations-list.
// Uses event delegation — attaches a single click listener on the container.
async function loadLocations() {
  const list = document.getElementById('locations-list');
  if (!list) return;

  // Attach delegated click handler once; subsequent reloads reuse it
  if (!list.dataset.listenerBound) {
    list.addEventListener('click', handleLocClick);
    list.dataset.listenerBound = '1';
  }

  try {
    const res  = await fetch(`${GATEWAY_URL}/api/locations`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) { list.innerHTML = `<p class="text-danger">${data.error || 'Failed to load locations.'}</p>`; return; }

    if (!data.length) { list.innerHTML = '<p class="text-muted">No saved locations yet.</p>'; return; }

    // Render one card per location; action buttons carry data-* attrs for delegation
    list.innerHTML = data.map(loc => `
      <div class="card mb-3 shadow-sm" id="loc-card-${loc.id}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <h6 class="card-title fw-semibold mb-0">${escapeHtml(loc.label)}</h6>
              <p class="text-muted small mb-0">${escapeHtml(loc.address)}</p>
            </div>
            <!-- Action buttons carry data-action and location data -->
            <div class="d-flex gap-2 flex-shrink-0">
              <button class="btn btn-sm btn-outline-secondary"
                      data-action="edit"
                      data-id="${loc.id}"
                      data-label="${escapeHtml(loc.label)}"
                      data-address="${escapeHtml(loc.address)}">
                Edit
              </button>
              <button class="btn btn-sm btn-outline-info"
                      data-action="weather"
                      data-id="${loc.id}">
                Weather
              </button>
              <button class="btn btn-sm btn-outline-danger"
                      data-action="delete"
                      data-id="${loc.id}">
                Delete
              </button>
            </div>
          </div>
          <!-- Weather panel: initially hidden; populated by toggleWeather() -->
          <div id="weather-${loc.id}" class="mt-3 d-none"></div>
        </div>
      </div>`).join('');
  } catch {
    list.innerHTML = '<p class="text-danger">Cannot reach the server.</p>';
  }
}

// Delegated click handler for the locations list
function handleLocClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const { action, id, label, address } = btn.dataset;

  // Dispatch to the appropriate handler based on data-action
  if (action === 'edit')    openEditModal(id, label, address);
  if (action === 'weather') toggleWeather(id);
  if (action === 'delete')  deleteLocation(id);
}

// Add a new favourite location
// Returns the raw fetch Response for the caller to handle.
async function addLocation(payload) {
  return fetch(`${GATEWAY_URL}/api/locations`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(payload)
  });
}

// Update label and/or address for a location
// Returns the raw fetch Response for the caller to handle.
async function updateLocation(id, payload) {
  return fetch(`${GATEWAY_URL}/api/locations/${id}`, {
    method:  'PATCH',
    headers: authHeaders(),
    body:    JSON.stringify(payload)
  });
}

// Delete a location
// Removes the card from the DOM on success without a full list reload.
async function deleteLocation(id) {
  if (!confirm('Delete this location?')) return;

  try {
    const res = await fetch(`${GATEWAY_URL}/api/locations/${id}`, {
      method:  'DELETE',
      headers: authHeaders()
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Could not delete location.');
      return;
    }

    // Remove the card directly; cheaper than re-fetching the whole list
    const card = document.getElementById(`loc-card-${id}`);
    if (card) card.remove();

    // Show empty state if nothing remains
    const list = document.getElementById('locations-list');
    if (list && !list.querySelector('.card')) {
      list.innerHTML = '<p class="text-muted">No saved locations yet.</p>';
    }
  } catch {
    alert('Cannot reach the server.');
  }
}

// Toggle weather panel for a location
// Fetches weather on first invocation; subsequent clicks show/hide the cached result.
async function toggleWeather(id) {
  const panel = document.getElementById(`weather-${id}`);
  if (!panel) return;

  // Cache hit: just toggle visibility
  if (panel.dataset.loaded) { panel.classList.toggle('d-none'); return; }

  panel.innerHTML = '<span class="text-muted small">Loading weather…</span>';
  panel.classList.remove('d-none');

  try {
    const res  = await fetch(`${GATEWAY_URL}/api/locations/${id}/weather`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      panel.innerHTML = `<span class="text-danger small">${data.error || 'Failed to load weather.'}</span>`;
      return;
    }

    // Render weather summary; condition, temperature, humidity, wind
    const w = data.weather;
    panel.innerHTML = `
      <div class="alert alert-info py-2 mb-0 small">
        <strong>${escapeHtml(w.condition)}</strong> —
        ${w.temp_c}°C (${w.temp_f}°F) ·
        Humidity: ${w.humidity}% ·
        Wind: ${w.wind_kph} km/h
        <span class="text-muted ms-2">
          Fetched: ${new Date(w.fetched_at).toLocaleTimeString('en-GB')}
        </span>
      </div>`;
    panel.dataset.loaded = '1'; // Mark so subsequent clicks only toggle
  } catch {
    panel.innerHTML = '<span class="text-danger small">Cannot reach the server.</span>';
  }
}

// Open edit modal pre-filled for a location
// Called from the delegated click handler via data-action="edit".
function openEditModal(id, label, address) {
  document.getElementById('edit-loc-id').value      = id;
  document.getElementById('edit-loc-label').value   = label;
  document.getElementById('edit-loc-address').value = address;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('edit-modal')).show();
}
