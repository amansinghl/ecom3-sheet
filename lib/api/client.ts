/**
 * API Client for backend communication
 * Base URL is determined by environment variable NEXT_PUBLIC_API_URL
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface ApiError {
  message: string;
  error?: string;
  status?: number;
  isTokenExpired?: boolean;
}

export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private onTokenExpired?: () => void;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set callback to be called when token expires
   */
  setOnTokenExpired(callback: () => void) {
    this.onTokenExpired = callback;
  }

  /**
   * Set the authentication token for API requests
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Core request handler
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Build headers with Authorization if token is available
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Add Authorization header if token is set
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle non-2xx responses
      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: response.statusText };
        }

        // Check for token expiration error
        const errorMessage = errorData.errors?.message || errorData.message || errorData.error || response.statusText;
        const isTokenExpired = 
          errorMessage.toLowerCase().includes('blacklisted') ||
          errorMessage.toLowerCase().includes('re-login') ||
          errorMessage.toLowerCase().includes('token expired') ||
          errorMessage.toLowerCase().includes('token has been') ||
          errorMessage.toLowerCase().includes('token not found') ||
          errorMessage.toLowerCase().includes('api token not found') ||
          errorMessage.toLowerCase().includes('authentication required') ||
          response.status === 401;

        if (isTokenExpired && this.onTokenExpired) {
          // Call the token expiration handler
          this.onTokenExpired();
        }

        const error: ApiError = {
          message: errorMessage,
          error: errorData.error,
          status: response.status,
          isTokenExpired,
        };

        if (isTokenExpired) {
          throw new TokenExpiredError(errorMessage);
        }

        throw error;
      }

      // Parse and return response
      const data = await response.json();
      return data as T;
    } catch (error) {
      // Re-throw TokenExpiredError and API errors
      if (error instanceof TokenExpiredError) {
        throw error;
      }
      if (error instanceof Error && 'status' in error) {
        throw error;
      }

      // Network or parsing error
      const networkError: ApiError = {
        message: error instanceof Error ? error.message : 'Network request failed',
        status: 0,
      };

      throw networkError;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing or custom instances
export default ApiClient;

