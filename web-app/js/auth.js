// Authentication helpers
'use strict';

// Token storage
const TOKEN_KEY = 'cab_token';

function getToken()    { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)   { localStorage.setItem(TOKEN_KEY, t); }
function removeToken() { localStorage.removeItem(TOKEN_KEY); }

// Request headers
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`
  };
}

// Route guard
function guardPage() {
  if (!getToken()) window.location.replace('index.html');
}

// Logout
function handleLogout() {
  removeToken();
  window.location.replace('index.html');
}

// Error state
function showError(msg) {
  const el = document.getElementById('error-msg');
  if (el) 
  { 
    el.textContent = msg; 
    el.classList.remove('d-none'); 
  }
}

function clearError() {
  const el = document.getElementById('error-msg');
  if (el) 
  { 
    el.textContent = ''; 
    el.classList.add('d-none'); 
  }
}
