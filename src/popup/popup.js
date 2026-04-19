import { isSupportedUrl, getFlagsFromUrl, constructUrlWithFlags, generatePortalUrl, parseFlag } from '../utils/url-helper.js';
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
const contextMenu = document.getElementById('context-menu');
const ctxCopy = document.getElementById('ctx-copy');
const ctxForceDisable = document.getElementById('ctx-force-disable');
const ctxClearOverride = document.getElementById('ctx-clear-override');
const sendFeedback = document.getElementById('send-feedback');

// State
let currentUrl = '';
let contextMenuTargetFlag = null;
let currentTabId = null;
let isPortal = false;
let urlFlags = []; // Array of { name: string, value: boolean } from URL
let pinnedFlags = {}; // Object: { flagName: true | null | 'forced' }
// Map of flag names to their state:
// - true: enabled (appears as "FlagName" in URL)
// - false: force-disabled (appears as "FlagName:false" in URL)
// - undefined: not in URL (default behavior)
let activeFlagsState = new Map();
let initialActiveFlagsState = new Map(); // To track changes
let currentTheme = 'dark';
let flagOrder = [];

// Icons
const PIN_ICON = `<svg viewBox="0 0 16 16"><path d="M9.5 1.5a.5.5 0 0 1 .5.5v4.5l2.5 2.5v1h-4v4l-1 1-1-1v-4h-4v-1l2.5-2.5V2a.5.5 0 0 1 .5-.5h4zm-3 5.5L4.707 9h6.586L9 7V2H7v5z"/></svg>`;
const PINNED_ICON = `<svg viewBox="0 0 16 16"><path d="M9.5 1.5a.5.5 0 0 1 .5.5v4.5l2.5 2.5v1h-4v4l-1 1-1-1v-4h-4v-1l2.5-2.5V2a.5.5 0 0 1 .5-.5h4z"/></svg>`;
const DELETE_ICON = `<svg viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`;

/**
 * Helper: Convert pinnedFlags storage value to Map value
 * Storage: true = enabled, null = default/off, 'forced' = force-disabled
 * Map: true = enabled, false = force-disabled, undefined = not in URL
 */
function storageValueToMapValue(storageValue) {
  if (storageValue === true) return true;
  if (storageValue === 'forced') return false;
  return undefined; // null or any other value means "not active"
}

/**
 * Helper: Convert Map value to storage value
 * Map: true = enabled, false = force-disabled, undefined = not in URL
 * Storage: true = enabled, null = default/off, 'forced' = force-disabled
 */
function mapValueToStorageValue(mapValue) {
  if (mapValue === true) return true;
  if (mapValue === false) return 'forced';
  return null;
}

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
    await applyBuildIndicator();

    flagOrder = await getFlagOrder();

    if (isPortal) {
      // getFlagsFromUrl now returns Array<{ name: string, value: boolean }>
      urlFlags = getFlagsFromUrl(currentUrl);
      
      // Create a map for case-insensitive lookup of pinned flags
      const pinnedKeysLower = new Map();
      Object.keys(pinnedFlags).forEach(key => {
        pinnedKeysLower.set(key.toLowerCase(), key);
      });

      // Initialize active state based on URL
      urlFlags.forEach(flagObj => {
        const lowerF = flagObj.name.toLowerCase();
        if (pinnedKeysLower.has(lowerF)) {
          // If it matches a pinned flag (case-insensitive), use the pinned flag's casing
          activeFlagsState.set(pinnedKeysLower.get(lowerF), flagObj.value);
        } else {
          activeFlagsState.set(flagObj.name, flagObj.value);
        }
      });
      
      setupPortalView();
    } else {
      // Initialize active state based on pinned preferences
      Object.entries(pinnedFlags).forEach(([name, storageValue]) => {
        const mapValue = storageValueToMapValue(storageValue);
        if (mapValue !== undefined) {
          activeFlagsState.set(name, mapValue);
        }
      });
      
      setupExternalView();
    }

    // Store initial state for comparison (deep copy)
    initialActiveFlagsState = new Map(activeFlagsState);

    renderFlags();

    // Event Listeners for static elements
    addFlagBtn.addEventListener('click', handleAddFlag);
    newFlagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddFlag();
    });
    themeToggle.addEventListener('click', handleThemeToggle);
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', handleClearSearch);

    if (sendFeedback) {
      sendFeedback.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: e.currentTarget.getAttribute('href') });
      });
    }

    // Context Menu Listeners
    document.addEventListener('click', hideContextMenu);
    ctxCopy.addEventListener('click', handleContextMenuCopy);
    ctxForceDisable.addEventListener('click', handleContextMenuForceDisable);
    ctxClearOverride.addEventListener('click', handleContextMenuClearOverride);
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
    const newUrl = constructUrlWithFlags(currentUrl, activeFlagsState);
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
    const newUrl = generatePortalUrl(activeFlagsState);
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
    // Check if all entries match
    for (const [flag, value] of activeFlagsState) {
      if (initialActiveFlagsState.get(flag) !== value) {
        hasChanges = true;
        break;
      }
    }
    // Also check if initial has keys that active doesn't
    if (!hasChanges) {
      for (const [flag] of initialActiveFlagsState) {
        if (!activeFlagsState.has(flag)) {
          hasChanges = true;
          break;
        }
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

  // 2. Prepare URL Flags (excluding pinned) - using flag names from parsed objects
  const pinnedKeysLower = new Set(Object.keys(pinnedFlags).map(k => k.toLowerCase()));
  let urlOnlyFlags = urlFlags
    .filter(flagObj => !pinnedKeysLower.has(flagObj.name.toLowerCase()))
    .map(flagObj => flagObj.name);
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
  const flagValue = activeFlagsState.get(flagName);
  const isOn = flagValue === true;
  const isForced = flagValue === false;
  
  const item = document.createElement('li');
  item.className = 'flag-item';
  if (isForced) {
    item.classList.add('forced');
  }
  item.draggable = isSavedSection;
  item.dataset.flag = flagName;
  
  let controlsHtml = '';
  let forcedBadge = isForced ? '<span class="forced-badge">OFF</span>' : '';

  if (isSavedSection) {
    controlsHtml = `
      <label class="switch">
        <input type="checkbox" ${isOn ? 'checked' : ''} ${isForced ? 'disabled' : ''}>
        <span class="slider"></span>
      </label>
      <button class="pin-btn ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Unpin' : 'Pin'}">
        ${isPinned ? PINNED_ICON : PIN_ICON}
      </button>
    `;
  } else {
    // For URL-only flags, show the value indicator
    const urlFlagObj = urlFlags.find(f => f.name === flagName);
    const urlValue = urlFlagObj ? urlFlagObj.value : true;
    forcedBadge = urlValue === false ? '<span class="forced-badge">OFF</span>' : '';
    
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
      ${forcedBadge}
    </div>
    <div class="flag-controls">
      ${controlsHtml}
    </div>
  `;

  // Event Listeners
  if (isSavedSection && !isForced) {
    const checkbox = item.querySelector('input');
    checkbox.addEventListener('change', (e) => handleToggle(flagName, e.target.checked));
  }
  
  if (!isSavedSection) {
    const deleteBtn = item.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => handleDeleteUrlFlag(flagName));
  }

  const pinBtn = item.querySelector('.pin-btn');
  pinBtn.addEventListener('click', () => handlePin(flagName));

  // Context Menu Event
  item.addEventListener('contextmenu', (e) => showContextMenu(e, flagName));

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
  urlFlags = urlFlags.filter(f => f.name !== flagName);
  
  checkForChanges();
  renderFlags();
}

/**
 * Handle toggling a flag on/off (not force-disabled)
 */
async function handleToggle(flagName, isChecked) {
  // Update local state
  if (isChecked) {
    activeFlagsState.set(flagName, true);
  } else {
    // When toggling off, remove from map (default behavior, not forced)
    activeFlagsState.delete(flagName);
  }

  // If pinned, update preference in storage
  if (Object.prototype.hasOwnProperty.call(pinnedFlags, flagName)) {
    const storageValue = isChecked ? true : null;
    await updatePinnedFlagStatus(flagName, storageValue);
    pinnedFlags[flagName] = storageValue; // Update local cache
  }

  checkForChanges();
  renderFlags();
}

/**
 * Handle Force Disable from context menu
 */
async function handleForceDisable(flagName) {
  // Set to false (force-disabled)
  activeFlagsState.set(flagName, false);

  // If pinned, update preference in storage
  if (Object.prototype.hasOwnProperty.call(pinnedFlags, flagName)) {
    await updatePinnedFlagStatus(flagName, 'forced');
    pinnedFlags[flagName] = 'forced'; // Update local cache
  }

  checkForChanges();
  renderFlags();
}

/**
 * Handle Clear Override from context menu
 */
async function handleClearOverride(flagName) {
  // Remove from active state (revert to default)
  activeFlagsState.delete(flagName);

  // If pinned, update preference in storage to null (default)
  if (Object.prototype.hasOwnProperty.call(pinnedFlags, flagName)) {
    await updatePinnedFlagStatus(flagName, null);
    pinnedFlags[flagName] = null; // Update local cache
  }

  checkForChanges();
  renderFlags();
}

/**
 * Handle pinning/unpinning a flag
 */
async function handlePin(flagName) {
  // Determine current state before toggling
  const currentMapValue = activeFlagsState.get(flagName);
  const initialStatus = mapValueToStorageValue(currentMapValue);
  
  const newPinnedState = await togglePin(flagName, initialStatus);
  pinnedFlags = newPinnedState;
  
  // If we just pinned it, ensure its current state is saved as preference
  if (Object.prototype.hasOwnProperty.call(pinnedFlags, flagName)) {
    const storageValue = mapValueToStorageValue(currentMapValue);
    await updatePinnedFlagStatus(flagName, storageValue);
    pinnedFlags[flagName] = storageValue;
  }
  
  renderFlags();
}

/**
 * Handle adding a new flag manually
 */
async function handleAddFlag() {
  let flagName = newFlagInput.value.trim();
  
  if (!flagName) return;
  
  // Parse the flag to handle "FlagName:false" input
  const parsed = parseFlag(flagName);
  flagName = parsed.name;
  const flagValue = parsed.value;
  
  // Add to active state
  activeFlagsState.set(flagName, flagValue);
  
  // Pin it by default so it persists
  const initialStatus = mapValueToStorageValue(flagValue);
  const newPinnedState = await togglePin(flagName, initialStatus);
  pinnedFlags = newPinnedState;
  
  // Ensure the correct state is saved
  await updatePinnedFlagStatus(flagName, initialStatus);
  pinnedFlags[flagName] = initialStatus;
  
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
 * Detect whether this extension is running as an unpacked (development)
 * build and reflect that on the toolbar action badge.
 */
async function applyBuildIndicator() {
  let isDev = false;
  try {
    const info = await new Promise((resolve, reject) => {
      try {
        chrome.management.getSelf((result) => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
    isDev = info && info.installType === 'development';
  } catch (e) {
    // management API not available or failed; treat as non-dev.
    isDev = false;
  }

  try {
    if (chrome.action && chrome.action.setBadgeText) {
      chrome.action.setBadgeText({ text: isDev ? 'DEV' : '' });
      if (isDev && chrome.action.setBadgeBackgroundColor) {
        chrome.action.setBadgeBackgroundColor({ color: '#d97706' });
      }
    }
  } catch (e) {
    // ignore if chrome.action badge APIs are unavailable
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

/**
 * Show custom context menu
 */
function showContextMenu(e, flagName) {
  e.preventDefault();
  contextMenuTargetFlag = flagName;
  
  // Determine flag state to show/hide relevant menu items
  const flagValue = activeFlagsState.get(flagName);
  const isForced = flagValue === false;
  const isEnabled = flagValue === true;
  
  // Show "Force Disable" only if not already forced
  ctxForceDisable.style.display = isForced ? 'none' : 'flex';
  // Show "Clear Override" only if there's an override (enabled or forced)
  ctxClearOverride.style.display = (isEnabled || isForced) ? 'flex' : 'none';
  
  // Position menu
  const x = e.clientX;
  const y = e.clientY;
  
  // Adjust if close to edge
  const menuWidth = 180;
  const menuHeight = 120;
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;
  
  const finalX = (x + menuWidth > winWidth) ? x - menuWidth : x;
  const finalY = (y + menuHeight > winHeight) ? y - menuHeight : y;

  contextMenu.style.left = `${finalX}px`;
  contextMenu.style.top = `${finalY}px`;
  contextMenu.style.display = 'block';
}

/**
 * Hide context menu
 */
function hideContextMenu() {
  contextMenu.style.display = 'none';
}

/**
 * Handle copy from context menu
 */
async function handleContextMenuCopy() {
  if (contextMenuTargetFlag) {
    try {
      await navigator.clipboard.writeText(contextMenuTargetFlag);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
  hideContextMenu();
}

/**
 * Handle Force Disable from context menu
 */
async function handleContextMenuForceDisable() {
  if (contextMenuTargetFlag) {
    await handleForceDisable(contextMenuTargetFlag);
  }
  hideContextMenu();
}

/**
 * Handle Clear Override from context menu
 */
async function handleContextMenuClearOverride() {
  if (contextMenuTargetFlag) {
    await handleClearOverride(contextMenuTargetFlag);
  }
  hideContextMenu();
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
