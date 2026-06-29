/**
 * API Service
 * 
 * Centralized service for handling all API operations.
 * Provides a clean interface for backend communication with proper error handling.
 * 
 * @author Juan
 * @version 1.0
 */

// API base configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';

/**
 * Get authentication headers for API requests
 * 
 * @param extra - Additional headers to include
 * @returns Headers object with authentication
 */
export const getAuthHeaders = (extra?: Record<string, string>): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

/**
 * Base API service class with common functionality
 */
export class ApiService {
  protected baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request to the API
   * 
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns Promise with response data
   */
  protected async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        ...options
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request to the API
   * 
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise with response data
   */
  protected async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: data ? JSON.stringify(data) : undefined,
        ...options
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a PUT request to the API
   * 
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param options - Request options
   * @returns Promise with response data
   */
  protected async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    try {
      console.log("Sending payload:", data);
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: data ? JSON.stringify(data) : undefined,
        ...options
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a DELETE request to the API
   * 
   * @param endpoint - API endpoint
   * @param options - Request options
   * @returns Promise with response data
   */
  protected async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        ...options
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Handle 204 No Content - no body to parse
      if (response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Handle error responses and format readable error messages.
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let message = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const text = await response.text();
      if (text && text.trim()) {
        try {
          const errorData = JSON.parse(text);
          if (typeof errorData?.error === 'string' && errorData.error.trim()) {
            message = errorData.error;
          } else if (typeof errorData?.message === 'string' && errorData.message.trim()) {
            message = errorData.message;
          } else if (typeof errorData?.message === 'object' && errorData.message !== null) {
            message = JSON.stringify(errorData.message);
          }
        } catch {
          // If not JSON, use the raw response text
          message = text;
        }
      }
    } catch {
      // Fallback to default message on error reading response text
    }

    // Friendly fallback for 401 Unauthorized
    if (response.status === 401) {
      if (!message || message.startsWith('HTTP 401') || message.toLowerCase() === 'unauthorized') {
        message = 'Username/email atau password salah. Silakan coba lagi!';
      }
    }

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
}
