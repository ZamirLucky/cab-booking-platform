// auth.js
// Shared authentication utilities: token storage, page guard, logout, and Fetch headers.
// Loaded on every page before page-specific scripts.
'use strict';

// Token storage (localStorage)
const TOKEN_KEY = 'cab_token';

function getToken()    { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)   { localStorage.setItem(TOKEN_KEY, t); }
function removeToken() { localStorage.removeItem(TOKEN_KEY); }

// Returns the Content-Type + Bearer auth header object for protected API calls.
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`
  };
}

// Call on DOMContentLoaded on every protected page.
// Immediately redirects to the login page if no token is stored.
function guardPage() {
  if (!getToken()) window.location.replace('index.html');
}

// Clears the stored token and returns the user to the login page.
function handleLogout() {
  removeToken();
  window.location.replace('index.html');
}

// Show or clear the Bootstrap error-msg alert element on the current page.
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
