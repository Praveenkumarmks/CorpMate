(function () {
"use strict";
// Small helper functions used across the app.

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Makes text safe to put inside HTML. Always use this for anything a user typed.
function esc(value) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (char) => map[char]);
}

const formatINR = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const today = () => new Date().toISOString().slice(0, 10);
const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");
const shortDate = (value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const sum = (list, getValue) => list.reduce((total, item) => total + (Number(getValue(item)) || 0), 0);

// localStorage can be blocked (private mode), so every access is wrapped.
function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
function storageRemove(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
CM.utils = { $, $$, esc, formatINR, today, toDateInput, shortDate, sum, storageGet, storageSet, storageRemove };
})();
