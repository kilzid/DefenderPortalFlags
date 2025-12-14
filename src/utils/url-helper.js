/**
 * Supported domains for the Microsoft Defender Portal.
 */
const SUPPORTED_DOMAINS = [
  'security.microsoft.com',
  'security.officeppe.com',
  'dev.security.microsoft.com',
  'sip.security.microsoft.com'
];

/**
 * Checks if the given URL belongs to a supported Defender Portal domain.
 * @param {string} url - The URL to check.
 * @returns {boolean} - True if supported, false otherwise.
 */
export function isSupportedUrl(url) {
  try {
    const urlObj = new URL(url);
    return SUPPORTED_DOMAINS.includes(urlObj.hostname);
  } catch (e) {
    return false;
  }
}

/**
 * Parses the 'flight' query parameter from a URL into an array of flag names.
 * @param {string} url - The URL to parse.
 * @returns {string[]} - Array of feature flag names.
 */
export function getFlagsFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const flightParam = urlObj.searchParams.get('flight');
    if (!flightParam) {
      return [];
    }
    return flightParam.split(',').map(f => f.trim()).filter(f => f.length > 0);
  } catch (e) {
    console.error('Error parsing URL flags:', e);
    return [];
  }
}

/**
 * Constructs a new URL with the specified feature flags.
 * @param {string} baseUrl - The base URL (or current URL) to modify.
 * @param {string[]} flags - Array of feature flag names to include.
 * @returns {string} - The new URL with the updated 'flight' parameter.
 */
export function constructUrlWithFlags(baseUrl, flags) {
  try {
    const urlObj = new URL(baseUrl);
    
    if (!flags || flags.length === 0) {
      urlObj.searchParams.delete('flight');
    } else {
      // Join flags with comma and set the parameter
      urlObj.searchParams.set('flight', flags.join(','));
    }
    
    return urlObj.toString();
  } catch (e) {
    console.error('Error constructing URL:', e);
    return baseUrl;
  }
}

/**
 * Generates the default portal URL with the given flags.
 * @param {string[]} flags - Array of feature flag names.
 * @returns {string} - The full URL to security.microsoft.com.
 */
export function generatePortalUrl(flags) {
  const baseUrl = 'https://security.microsoft.com/';
  return constructUrlWithFlags(baseUrl, flags);
}