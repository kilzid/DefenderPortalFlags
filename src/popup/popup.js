import { isSupportedUrl, getFlagsFromUrl, constructUrlWithFlags, generatePortalUrl } from '../utils/url-helper.js';
import { getPinnedFlags, togglePin, updatePinnedFlagStatus, getThemePreference, setThemePreference } from '../utils/storage-helper.js';

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const flagsList = document.getElementById('flags-list');
const actionButton = document.getElementById('action-button');
const newFlagInput = document.getElementById('new-flag-input');
const addFlagBtn = document.getElementById('add-flag-btn');
const themeToggle = document.getElementById('theme-toggle');
const moonIcon = document.querySelector('.moon-icon');
const sunIcon = document.querySelector('.sun-icon');

// State
let currentUrl = '';
let isPortal = false;
let urlFlags = []; // Flags currently in the URL
let pinnedFlags = {}; // Object: { flagName: isEnabled }
let activeFlagsState = new Set(); // Set of flag names currently toggled ON in the UI
let currentTheme = 'light';

// Icons
const PIN_ICON = `<svg viewBox="0 0 16 16"><path d="M9.5 1.5a.5.5 0 0 1 .5.5v4.5l2.5 2.5v1h-4v4l-1 1-1-1v-4h-4v-1l2.5-2.5V2a.5.5 0 0 1 .5-.5h4zm-3 5.5L4.707 9h6.586L9 7V2H7v5z"/></svg>`;
const PINNED_ICON = `<svg viewBox="0 0 16 16"><path d="M9.5 1.5a.5.5 0 0 1 .5.5v4.5l2.5 2.5v1h-4v4l-1 1-1-1v-4h-4v-1l2.5-2.5V2a.5.5 0 0 1 .5-.5h4z"/></svg>`;

/**
 * Initialize the popup
 */
async function init() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab.url;
    isPortal = isSupportedUrl(currentUrl);

    // Load data
    pinnedFlags = await getPinnedFlags();
    currentTheme = await getThemePreference();
    applyTheme(currentTheme);

    if (isPortal) {
      urlFlags = getFlagsFromUrl(currentUrl);
      // Initialize active state based on URL
      urlFlags.forEach(f => activeFlagsState.add(f));
      
      setupPortalView();
    } else {
      // Initialize active state based on pinned preferences
      Object.entries(pinnedFlags).forEach(([name, enabled]) => {
        if (enabled) activeFlagsState.add(name);
      });
      
      setupExternalView();
    }

    renderFlags();

    // Event Listeners for static elements
    addFlagBtn.addEventListener('click', handleAddFlag);
    newFlagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddFlag();
    });
    themeToggle.addEventListener('click', handleThemeToggle);
  } catch (error) {
    console.error('Initialization error:', error);
    flagsList.innerHTML = `<div class="empty-state">Error loading extension: ${error.message}</div>`;
  }
}

/**
 * Setup UI for when user is on the Defender Portal
 */
function setupPortalView() {
  statusIndicator.textContent = 'Portal Detected';
  statusIndicator.classList.add('active');
  actionButton.textContent = 'Apply Changes';
  actionButton.disabled = false;
  
  actionButton.onclick = () => {
    const newUrl = constructUrlWithFlags(currentUrl, Array.from(activeFlagsState));
    chrome.tabs.update({ url: newUrl });
    window.close();
  };
}

/**
 * Setup UI for when user is NOT on the Defender Portal
 */
function setupExternalView() {
  statusIndicator.textContent = 'Not on Portal';
  statusIndicator.classList.remove('active');
  actionButton.textContent = 'Go to Microsoft Defender Portal';
  actionButton.disabled = false;
  
  actionButton.onclick = () => {
    const newUrl = generatePortalUrl(Array.from(activeFlagsState));
    chrome.tabs.update({ url: newUrl });
    window.close();
  };
}

/**
 * Render the list of flags
 */
function renderFlags() {
  flagsList.innerHTML = '';
  
  // Merge lists: All pinned flags + any URL flags not already pinned
  const allFlagNames = new Set([
    ...Object.keys(pinnedFlags),
    ...urlFlags
  ]);
  
  const sortedFlags = Array.from(allFlagNames).sort();

  if (sortedFlags.length === 0) {
    flagsList.innerHTML = '<div class="empty-state">No flags detected or pinned.</div>';
    return;
  }

  sortedFlags.forEach(flagName => {
    const isPinned = Object.prototype.hasOwnProperty.call(pinnedFlags, flagName);
    const isOn = activeFlagsState.has(flagName);
    
    const item = document.createElement('li');
    item.className = 'flag-item';
    
    item.innerHTML = `
      <div class="flag-info">
        <span class="flag-name" title="${flagName}">${flagName}</span>
      </div>
      <div class="flag-controls">
        <label class="switch">
          <input type="checkbox" ${isOn ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
        <button class="pin-btn ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Unpin' : 'Pin'}">
          ${isPinned ? PINNED_ICON : PIN_ICON}
        </button>
      </div>
    `;

    // Event Listeners
    const checkbox = item.querySelector('input');
    checkbox.addEventListener('change', (e) => handleToggle(flagName, e.target.checked));

    const pinBtn = item.querySelector('.pin-btn');
    pinBtn.addEventListener('click', () => handlePin(flagName));

    flagsList.appendChild(item);
  });
}

/**
 * Handle toggling a flag on/off
 */
async function handleToggle(flagName, isChecked) {
  // Update local state
  if (isChecked) {
    activeFlagsState.add(flagName);
  } else {
    activeFlagsState.delete(flagName);
  }

  // If pinned, update preference in storage
  if (Object.prototype.hasOwnProperty.call(pinnedFlags, flagName)) {
    await updatePinnedFlagStatus(flagName, isChecked);
    pinnedFlags[flagName] = isChecked; // Update local cache
  }
}

/**
 * Handle pinning/unpinning a flag
 */
async function handlePin(flagName) {
  const newPinnedState = await togglePin(flagName);
  pinnedFlags = newPinnedState;
  
  // If we just pinned it, ensure its current state is saved as preference
  if (Object.prototype.hasOwnProperty.call(pinnedFlags, flagName)) {
    const isCurrentlyOn = activeFlagsState.has(flagName);
    await updatePinnedFlagStatus(flagName, isCurrentlyOn);
    pinnedFlags[flagName] = isCurrentlyOn;
  }
  
  renderFlags();
}

/**
 * Handle adding a new flag manually
 */
async function handleAddFlag() {
  const flagName = newFlagInput.value.trim();
  
  if (!flagName) return;
  
  // Add to active state
  activeFlagsState.add(flagName);
  
  // Pin it by default so it persists
  // We need to use togglePin to add it to the list first, then update status
  const newPinnedState = await togglePin(flagName);
  pinnedFlags = newPinnedState;
  
  // Ensure it's enabled
  await updatePinnedFlagStatus(flagName, true);
  pinnedFlags[flagName] = true;
  
  // Clear input
  newFlagInput.value = '';
  
  renderFlags();
}

/**
 * Apply the selected theme to the UI
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  if (theme === 'dark') {
    moonIcon.style.display = 'none';
    sunIcon.style.display = 'block';
  } else {
    moonIcon.style.display = 'block';
    sunIcon.style.display = 'none';
  }
}

/**
 * Handle theme toggle click
 */
async function handleThemeToggle() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(currentTheme);
  await setThemePreference(currentTheme);
}

// Start
document.addEventListener('DOMContentLoaded', init);