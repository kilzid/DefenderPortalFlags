import { isSupportedUrl, getFlagsFromUrl, constructUrlWithFlags, generatePortalUrl } from '../utils/url-helper.js';
import { getPinnedFlags, togglePin, updatePinnedFlagStatus, getThemePreference, setThemePreference, getFlagOrder, setFlagOrder } from '../utils/storage-helper.js';

// DOM Elements
const statusIndicator = document.getElementById('status-indicator');
const flagsListContainer = document.getElementById('flags-list-container');
const actionButton = document.getElementById('action-button');
const newFlagInput = document.getElementById('new-flag-input');
const addFlagBtn = document.getElementById('add-flag-btn');
const themeToggle = document.getElementById('theme-toggle');
const moonIcon = document.querySelector('.moon-icon');
const sunIcon = document.querySelector('.sun-icon');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
// State
let currentUrl = '';
let currentTabId = null;
let isPortal = false;
let urlFlags = []; // Flags currently in the URL
let pinnedFlags = {}; // Object: { flagName: isEnabled }
let activeFlagsState = new Set(); // Set of flag names currently toggled ON in the UI
let initialActiveFlagsState = new Set(); // To track changes
let currentTheme = 'light';
let flagOrder = [];

// Icons
const PIN_ICON = `<svg viewBox="0 0 16 16"><path d="M9.5 1.5a.5.5 0 0 1 .5.5v4.5l2.5 2.5v1h-4v4l-1 1-1-1v-4h-4v-1l2.5-2.5V2a.5.5 0 0 1 .5-.5h4zm-3 5.5L4.707 9h6.586L9 7V2H7v5z"/></svg>`;
const PINNED_ICON = `<svg viewBox="0 0 16 16"><path d="M9.5 1.5a.5.5 0 0 1 .5.5v4.5l2.5 2.5v1h-4v4l-1 1-1-1v-4h-4v-1l2.5-2.5V2a.5.5 0 0 1 .5-.5h4z"/></svg>`;
const DELETE_ICON = `<svg viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`;

/**
 * Initialize the popup
 */
async function init() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab.url;
    currentTabId = tab.id;
    isPortal = isSupportedUrl(currentUrl);

    // Load data
    pinnedFlags = await getPinnedFlags();
    currentTheme = await getThemePreference();
    applyTheme(currentTheme);

    flagOrder = await getFlagOrder();

    if (isPortal) {
      urlFlags = getFlagsFromUrl(currentUrl);
      
      // Create a map for case-insensitive lookup of pinned flags
      const pinnedKeysLower = new Map();
      Object.keys(pinnedFlags).forEach(key => {
        pinnedKeysLower.set(key.toLowerCase(), key);
      });

      // Initialize active state based on URL
      urlFlags.forEach(f => {
        const lowerF = f.toLowerCase();
        if (pinnedKeysLower.has(lowerF)) {
          // If it matches a pinned flag (case-insensitive), use the pinned flag's casing
          activeFlagsState.add(pinnedKeysLower.get(lowerF));
        } else {
          activeFlagsState.add(f);
        }
      });
      
      setupPortalView();
    } else {
      // Initialize active state based on pinned preferences
      Object.entries(pinnedFlags).forEach(([name, enabled]) => {
        if (enabled) activeFlagsState.add(name);
      });
      
      setupExternalView();
    }

    // Store initial state for comparison
    initialActiveFlagsState = new Set(activeFlagsState);

    renderFlags();

    // Event Listeners for static elements
    addFlagBtn.addEventListener('click', handleAddFlag);
    newFlagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddFlag();
    });
    themeToggle.addEventListener('click', handleThemeToggle);
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', handleClearSearch);
  } catch (error) {
    console.error('Initialization error:', error);
    flagsListContainer.innerHTML = `<div class="empty-state">Error loading extension: ${error.message}</div>`;
  }
}

/**
 * Setup UI for when user is on the Defender Portal
 */
function setupPortalView() {
  statusIndicator.textContent = 'Portal Detected';
  statusIndicator.classList.add('active');
  actionButton.textContent = 'Apply Changes';
  actionButton.disabled = true; // Disabled by default until changes are made
  
  actionButton.onclick = () => {
    const newUrl = constructUrlWithFlags(currentUrl, Array.from(activeFlagsState));
    chrome.tabs.update(currentTabId, { url: newUrl });
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
  actionButton.disabled = false; // Always enabled for external view
  
  actionButton.onclick = () => {
    const newUrl = generatePortalUrl(Array.from(activeFlagsState));
    chrome.tabs.update(currentTabId, { url: newUrl });
    window.close();
  };
}

/**
 * Check if there are unsaved changes and update button state
 */
function checkForChanges() {
  if (!isPortal) return; // Only relevant for portal view

  let hasChanges = false;

  // Check if sizes are different
  if (activeFlagsState.size !== initialActiveFlagsState.size) {
    hasChanges = true;
  } else {
    // Check if all elements in activeFlagsState are in initialActiveFlagsState
    for (let flag of activeFlagsState) {
      if (!initialActiveFlagsState.has(flag)) {
        hasChanges = true;
        break;
      }
    }
  }

  actionButton.disabled = !hasChanges;
}

/**
 * Render the list of flags
 */
function renderFlags() {
  flagsListContainer.innerHTML = '';
  
  const searchTerm = searchInput.value.trim().toLowerCase();

  // 1. Prepare Saved Flags
  let savedFlags = Object.keys(pinnedFlags);
  savedFlags.sort((a, b) => {
    const indexA = flagOrder.indexOf(a);
    const indexB = flagOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  // 2. Prepare URL Flags (excluding pinned)
  const pinnedKeysLower = new Set(Object.keys(pinnedFlags).map(k => k.toLowerCase()));
  let urlOnlyFlags = urlFlags.filter(f => !pinnedKeysLower.has(f.toLowerCase()));
  urlOnlyFlags.sort((a, b) => a.localeCompare(b));

  // 3. Filter
  if (searchTerm) {
    savedFlags = savedFlags.filter(f => f.toLowerCase().includes(searchTerm));
    urlOnlyFlags = urlOnlyFlags.filter(f => f.toLowerCase().includes(searchTerm));
  }

  // 4. Empty State
  if (savedFlags.length === 0 && urlOnlyFlags.length === 0) {
    if (searchTerm) {
      flagsListContainer.innerHTML = '<div class="empty-state">No flags match your search.</div>';
    } else {
      flagsListContainer.innerHTML = '<div class="empty-state">No flags detected or pinned.</div>';
    }
    return;
  }

  // 5. Render Sections
  if (savedFlags.length > 0) {
    renderSection('Saved', savedFlags, true);
  }

  if (urlOnlyFlags.length > 0) {
    renderSection('From URL', urlOnlyFlags, false);
  }
}

function renderSection(title, flags, isSavedSection) {
  const section = document.createElement('div');
  section.className = 'flag-section';
  
  const header = document.createElement('div');
  header.className = 'section-header';
  header.textContent = title;
  section.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'flags-list';
  
  flags.forEach(flagName => {
    const item = createFlagItem(flagName, isSavedSection);
    list.appendChild(item);
  });
  
  section.appendChild(list);
  flagsListContainer.appendChild(section);
}

function createFlagItem(flagName, isSavedSection) {
  const isPinned = Object.prototype.hasOwnProperty.call(pinnedFlags, flagName);
  const isOn = activeFlagsState.has(flagName);
  
  const item = document.createElement('li');
  item.className = 'flag-item';
  item.draggable = isSavedSection;
  item.dataset.flag = flagName;
  
  let controlsHtml = '';

  if (isSavedSection) {
    controlsHtml = `
      <label class="switch">
        <input type="checkbox" ${isOn ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
      <button class="pin-btn ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Unpin' : 'Pin'}">
        ${isPinned ? PINNED_ICON : PIN_ICON}
      </button>
    `;
  } else {
    controlsHtml = `
      <button class="pin-btn ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Unpin' : 'Pin'}">
        ${isPinned ? PINNED_ICON : PIN_ICON}
      </button>
      <button class="delete-btn" title="Remove from URL">
        ${DELETE_ICON}
      </button>
    `;
  }

  item.innerHTML = `
    <div class="flag-info">
      <span class="flag-name" title="${flagName}">${flagName}</span>
    </div>
    <div class="flag-controls">
      ${controlsHtml}
    </div>
  `;

  // Event Listeners
  if (isSavedSection) {
    const checkbox = item.querySelector('input');
    checkbox.addEventListener('change', (e) => handleToggle(flagName, e.target.checked));
  } else {
    const deleteBtn = item.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => handleDeleteUrlFlag(flagName));
  }

  const pinBtn = item.querySelector('.pin-btn');
  pinBtn.addEventListener('click', () => handlePin(flagName));

  if (isSavedSection) {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('dragend', handleDragEnd);
  }

  return item;
}

/**
 * Handle deleting a flag from the URL list
 */
function handleDeleteUrlFlag(flagName) {
  // Remove from active state
  activeFlagsState.delete(flagName);
  
  // Remove from urlFlags list so it disappears from the UI
  urlFlags = urlFlags.filter(f => f !== flagName);
  
  checkForChanges();
  renderFlags();
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

  checkForChanges();
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
  
  checkForChanges();
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

/**
 * Handle search input
 */
function handleSearch() {
  const searchTerm = searchInput.value.trim();
  clearSearchBtn.style.display = searchTerm ? 'flex' : 'none';
  renderFlags();
}

/**
 * Handle clear search
 */
function handleClearSearch() {
  searchInput.value = '';
  clearSearchBtn.style.display = 'none';
  renderFlags();
  searchInput.focus();
}

let dragSrcEl = null;

function handleDragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
  this.classList.add('dragging');
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

async function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  if (dragSrcEl !== this) {
    // Reorder DOM
    // Ensure we are in the same list
    if (dragSrcEl.parentNode !== this.parentNode) return false;

    const list = this.parentNode;
    const allItems = [...list.querySelectorAll('.flag-item')];
    const srcIndex = allItems.indexOf(dragSrcEl);
    const targetIndex = allItems.indexOf(this);

    if (srcIndex < targetIndex) {
      this.after(dragSrcEl);
    } else {
      this.before(dragSrcEl);
    }

    // Update Order Persistence (Only for Saved list)
    const newOrder = [...list.querySelectorAll('.flag-item')].map(item => item.dataset.flag);
    flagOrder = newOrder;
    await setFlagOrder(newOrder);
  }

  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  const items = document.querySelectorAll('.flag-item');
  items.forEach(item => item.classList.remove('drag-over'));
}

// Start
document.addEventListener('DOMContentLoaded', init);