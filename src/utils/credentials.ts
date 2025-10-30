/**
 * Utility functions for handling credential encoding/decoding
 * This can be used on both frontend and backend
 */

export interface DecodedCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

/**
 * Decode credentials from base64 encoded string
 * @param encodedCreds - Base64 encoded credentials string
 * @returns Decoded credentials object or null if invalid
 */
export function decodeCredentials(encodedCreds: string): DecodedCredentials | null {
  try {
    const decoded = Buffer.from(decodeURIComponent(encodedCreds), 'base64').toString('utf-8');
    const credentials = JSON.parse(decoded);
    
    // Validate that we have the required fields
    if (credentials && typeof credentials.email === 'string' && typeof credentials.password === 'string') {
      return {
        email: credentials.email,
        password: credentials.password,
        tenantId: credentials.tenantId || undefined
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to decode credentials:', error);
    return null;
  }
}

/**
 * Encode credentials to base64 string
 * @param email - User email
 * @param password - User password
 * @param tenantId - Optional tenant ID for multi-tenant systems
 * @returns Base64 encoded credentials string
 */
export function encodeCredentials(email: string, password: string, tenantId?: string): string {
  const credentials: { email: string; password: string; tenantId?: string } = { email, password };
  if (tenantId) {
    credentials.tenantId = tenantId;
  }
  return Buffer.from(JSON.stringify(credentials)).toString('base64');
}

/**
 * Extract credentials from URL search params
 * @param url - Full URL or search params string
 * @returns Decoded credentials or null if not found/invalid
 */
export function extractCredentialsFromUrl(url: string): DecodedCredentials | null {
  try {
    // Handle both full URL and search params
    const searchParams = url.includes('?') 
      ? new URLSearchParams(url.split('?')[1])
      : new URLSearchParams(url);
    
    const credsParam = searchParams.get('creds');
    
    if (!credsParam) {
      return null;
    }
    
    return decodeCredentials(credsParam);
  } catch (error) {
    console.error('Failed to extract credentials from URL:', error);
    return null;
  }
}

/**
 * Frontend JavaScript version (for browsers that don't support Buffer)
 * Use this in your frontend code instead of the Node.js version above
 */
export const frontendCredentialUtils = {
  /**
   * Decode credentials from base64 encoded string (browser-compatible)
   */
  decodeCredentials(encodedCreds: string): DecodedCredentials | null {
    try {
      const decoded = atob(decodeURIComponent(encodedCreds));
      const credentials = JSON.parse(decoded);
      
      if (credentials && typeof credentials.email === 'string' && typeof credentials.password === 'string') {
        return {
          email: credentials.email,
          password: credentials.password,
          tenantId: credentials.tenantId || undefined
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to decode credentials:', error);
      return null;
    }
  },

  /**
   * Extract credentials from current page URL (browser-compatible)
   */
  extractCredentialsFromCurrentUrl(): DecodedCredentials | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const credsParam = urlParams.get('creds');
      
      if (!credsParam) {
        return null;
      }
      
      return this.decodeCredentials(credsParam);
    } catch (error) {
      console.error('Failed to extract credentials from URL:', error);
      return null;
    }
  },

  /**
   * Clear credentials from URL after use (for security)
   */
  clearCredentialsFromUrl(): void {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('creds');
      
      // Replace the URL without adding to history
      window.history.replaceState({}, document.title, url.toString());
    } catch (error) {
      console.error('Failed to clear credentials from URL:', error);
    }
  }
};