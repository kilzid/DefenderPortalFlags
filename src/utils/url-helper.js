/**
 * Standard domains for the Microsoft Defender Portal.
 */
const STANDARD_PORTAL_DOMAINS = [
  'security.microsoft.com',
  'security.officeppe.com',
  'dev.security.microsoft.com',
  'sip.security.microsoft.com',
  'df.security.microsoft.com'
];

const SUPPORTED_DOMAINS = new Set(
  STANDARD_PORTAL_DOMAINS.flatMap(domain => [domain, `mto.${domain}`])
);

/**
 * Checks if the given URL belongs to a supported Defender Portal domain.
 * @param {string} url - The URL to check.
 * @returns {boolean} - True if supported, false otherwise.
 */
export function isSupportedUrl(url) {
  try {
    const urlObj = new URL(url);
    return SUPPORTED_DOMAINS.has(urlObj.hostname);
  } catch (e) {
    return false;
  }
}

/**
 * Parses a single flag string into an object with name and value.
 * Handles both "FlagName" (true) and "FlagName:false" (false) formats.
 * @param {string} flagStr - The flag string to parse.
 * @returns {{ name: string, value: boolean }} - The parsed flag object.
 */
export function parseFlag(flagStr) {
  const trimmed = flagStr.trim();
  if (trimmed.toLowerCase().endsWith(':false')) {
    return {
      name: trimmed.slice(0, -6), // Remove ':false'
      value: false
    };
  }
  return {
    name: trimmed,
    value: true
  };
}

/**
 * Parses the 'flight' query parameter from a URL into an array of flag objects.
 * Each object contains the flag name and its value (true for enabled, false for forced disabled).
 * @param {string} url - The URL to parse.
 * @returns {Array<{ name: string, value: boolean }>} - Array of feature flag objects.
 */
export function getFlagsFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const flightParam = urlObj.searchParams.get('flight');
    if (!flightParam) {
      return [];
    }
    return flightParam
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0)
      .map(f => parseFlag(f));
  } catch (e) {
    console.error('Error parsing URL flags:', e);
    return [];
  }
}

/**
 * Constructs a new URL with the specified feature flags.
 * @param {string} baseUrl - The base URL (or current URL) to modify.
 * @param {Map<string, boolean>} flagsMap - Map of flag names to their values (true=enabled, false=forced disabled).
 * @returns {string} - The new URL with the updated 'flight' parameter.
 */
export function constructUrlWithFlags(baseUrl, flagsMap) {
  try {
    const urlObj = new URL(baseUrl);
    
    if (!flagsMap || flagsMap.size === 0) {
      urlObj.searchParams.delete('flight');
    } else {
      // Build flag strings: "Name" for true, "Name:false" for false
      const flagStrings = [];
      for (const [name, value] of flagsMap) {
        if (value === true) {
          flagStrings.push(name);
        } else if (value === false) {
          flagStrings.push(`${name}:false`);
        }
        // undefined/null values are not included in the URL
      }
      
      if (flagStrings.length === 0) {
        urlObj.searchParams.delete('flight');
      } else {
        urlObj.searchParams.set('flight', flagStrings.join(','));
      }
    }
    
    return urlObj.toString();
  } catch (e) {
    console.error('Error constructing URL:', e);
    return baseUrl;
  }
}

/**
 * Generates the default portal URL with the given flags.
 * @param {Map<string, boolean>} flagsMap - Map of flag names to their values.
 * @returns {string} - The full URL to security.microsoft.com.
 */
export function generatePortalUrl(flagsMap) {
  const baseUrl = 'https://security.microsoft.com/';
  return constructUrlWithFlags(baseUrl, flagsMap);
}