/**
 * Fetch wrapper that automatically handles authentication errors
 * Redirects to appropriate login page on 401 errors
 */

type FetchOptions = RequestInit & {
  credentials?: RequestCredentials;
};

/**
 * Fetch wrapper for authenticated requests
 * Automatically redirects to login on 401 errors
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param loginPath - Path to redirect to on 401 (default: /login)
 * @returns Promise<Response>
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {},
  loginPath: string = '/login'
): Promise<Response> {
  // Always include credentials to send cookies
  const fetchOptions: FetchOptions = {
    ...options,
    credentials: 'include',
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      console.log('Session expired or unauthorized, redirecting to login...');
      window.location.href = loginPath;
      // Return a dummy response to prevent further processing
      return new Response(null, { status: 401 });
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * Fetch wrapper specifically for pharmacy routes
 * Redirects to /pharmacy on 401
 */
export async function fetchPharmacy(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  return fetchWithAuth(url, options, '/pharmacy');
}

/**
 * Fetch wrapper specifically for admin routes
 * Redirects to /admin on 401
 */
export async function fetchAdmin(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  return fetchWithAuth(url, options, '/admin');
}

/**
 * Fetch wrapper specifically for patient routes
 * Redirects to /login on 401
 */
export async function fetchPatient(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  return fetchWithAuth(url, options, '/login');
}
