/**
 * Key used for storing pinned flags in chrome.storage.local.
 */
const STORAGE_KEY = 'pinnedFlags';

/**
 * Retrieves the list of pinned flags from storage.
 * @returns {Promise<Object>} - A promise that resolves to an object where keys are flag names and values are booleans (enabled/disabled).
 */
export function getPinnedFlags() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || {});
    });
  });
}

/**
 * Toggles the pinned status of a flag.
 * If the flag is already pinned, it removes it.
 * If the flag is not pinned, it adds it with a default enabled status of true.
 * @param {string} flagName - The name of the flag to toggle.
 * @returns {Promise<Object>} - A promise that resolves to the updated pinned flags object.
 */
export function togglePin(flagName) {
  return new Promise((resolve) => {
    getPinnedFlags().then((pinnedFlags) => {
      if (Object.prototype.hasOwnProperty.call(pinnedFlags, flagName)) {
        delete pinnedFlags[flagName];
      } else {
        pinnedFlags[flagName] = true; // Default to enabled when pinning
      }
      
      chrome.storage.local.set({ [STORAGE_KEY]: pinnedFlags }, () => {
        resolve(pinnedFlags);
      });
    });
  });
}

/**
 * Updates the enabled status of a pinned flag.
 * @param {string} flagName - The name of the flag.
 * @param {boolean} isEnabled - The new enabled status.
 * @returns {Promise<void>}
 */
export function updatePinnedFlagStatus(flagName, isEnabled) {
  return new Promise((resolve) => {
    getPinnedFlags().then((pinnedFlags) => {
      if (Object.prototype.hasOwnProperty.call(pinnedFlags, flagName)) {
        pinnedFlags[flagName] = isEnabled;
        chrome.storage.local.set({ [STORAGE_KEY]: pinnedFlags }, () => {
          resolve();
        });
      } else {
        resolve(); // Flag not pinned, nothing to update
      }
    });
  });
}