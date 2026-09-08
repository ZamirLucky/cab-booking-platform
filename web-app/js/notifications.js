// Notification helpers
'use strict';

// Date formatting
function formatNotifDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Type styling
function typeBadge(type) {
  const map = { cab_ready: 'info', discount: 'success' };
  const cls = map[type] || 'secondary';
  return `<span class="badge bg-${cls} me-2 text-capitalize">${type.replace('_', ' ')}</span>`;
}

// Notification list
async function loadNotifications() {
  const list = document.getElementById('notifications-list');
  if (!list) return;

  clearError();

  try {
    const res  = await fetch(`${GATEWAY_URL}/api/customers/notifications`, { headers: authHeaders() });
    const data = await res.json();

    // Session expiry
    if (res.status === 401) { handleLogout(); return; }
    if (!res.ok) { showError(data.error || 'Failed to load notifications.'); return; }

    const items = data.notifications || [];

    if (!items.length) {
      list.innerHTML = '<p class="empty-state">No notifications yet.</p>';
      return;
    }

    // List rendering
    list.innerHTML = items.map(n => `
      <div class="list-group-item ${n.is_read ? '' : 'notification-unread'}" id="notif-${n.id}">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-1">
          <div>
            ${typeBadge(n.type)}
            <span class="${n.is_read ? '' : 'fw-bold'}">${n.title}</span>
          </div>
          <small class="text-muted text-nowrap">${formatNotifDate(n.created_at)}</small>
        </div>
        <p class="mb-1 mt-1 small text-muted">${n.message}</p>
        ${n.is_read
          ? ''
          : `<button class="btn btn-sm btn-outline-secondary"
                     onclick="markRead('${n.id}')">Mark as Read</button>`}
      </div>`).join('');
  } catch {
    showError('Cannot reach the server.');
  }
}

// Read status
async function markRead(id) {
  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/customers/notifications/${id}/read`,
      { method: 'PATCH', headers: authHeaders() }
    );

    if (res.status === 401) { handleLogout(); return; }

    if (!res.ok) {
      const d = await res.json();
      showError(d.error || 'Could not mark notification as read.');
      return;
    }

    // Refresh
    await loadNotifications();
  } catch {
    showError('Cannot reach the server.');
  }
}
