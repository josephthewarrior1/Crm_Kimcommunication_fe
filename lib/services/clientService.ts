/**
 * Client Service
 * 
 * Service module for handling client-related API operations.
 * Provides a clean interface for client management operations.
 * 
 * @author Juan
 * @version 1.0
 */

/**
 * Client interface matching the backend Client entity
 */
export interface Client {
  id: number;
  name: string;
  industry?: { id: number; name: string } | string;
  country?: { id: number; name: string; code?: string } | string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Client creation/update data
 */
export interface ClientData {
  name: string;
  industry?: string;
  industryId?: number;
  country?: string;
  countryId?: number;
}

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Client Service Class
 * 
 * Handles all client-related API operations with proper error handling
 * and type safety.
 */
export class ClientService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all clients
   * 
   * @returns Promise<Client[]> List of all clients
   */
  async getAllClients(): Promise<Client[]> {
    try {
      const response = await fetch(`${this.baseUrl}/clients`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error('Failed to load clients. Please try again.');
    }
  }

  /**
   * Get a specific client by ID
   * 
   * @param id Client ID
   * @returns Promise<Client> Client data
   */
  async getClientById(id: number): Promise<Client> {
    try {
      const response = await fetch(`${this.baseUrl}/clients/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Client not found');
        }
        throw new Error(`Failed to fetch client: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching client:', error);
      throw error;
    }
  }

  /**
   * Create a new client
   * 
   * @param clientData Client data to create
   * @returns Promise<Client> Created client
   */
  async createClient(clientData: ClientData): Promise<Client> {
    try {
      const response = await fetch(`${this.baseUrl}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('A client with this name already exists');
        }
        throw new Error(`Failed to create client: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  /**
   * Update an existing client
   * 
   * @param id Client ID to update
   * @param clientData Updated client data
   * @returns Promise<Client> Updated client
   */
  async updateClient(id: number, clientData: ClientData): Promise<Client> {
    try {
      const response = await fetch(`${this.baseUrl}/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Client not found');
        }
        if (response.status === 409) {
          throw new Error('A client with this name already exists');
        }
        throw new Error(`Failed to update client: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  /**
   * Delete a client
   * 
   * @param id Client ID to delete
   * @returns Promise<void>
   */
  async deleteClient(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/clients/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Client not found');
        }
        throw new Error(`Failed to delete client: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  /**
   * Search clients by name
   * 
   * @param name Search term
   * @returns Promise<Client[]> Matching clients
   */
  async searchClients(name: string): Promise<Client[]> {
    try {
      const response = await fetch(`${this.baseUrl}/clients/search?name=${encodeURIComponent(name)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to search clients: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching clients:', error);
      throw new Error('Failed to search clients. Please try again.');
    }
  }

  /**
   * Get clients by industry
   * 
   * @param industry Industry to filter by
   * @returns Promise<Client[]> Clients in the industry
   */
  async getClientsByIndustry(industry: string): Promise<Client[]> {
    try {
      const response = await fetch(`${this.baseUrl}/clients/industry/${encodeURIComponent(industry)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch clients by industry: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching clients by industry:', error);
      throw new Error('Failed to load clients by industry. Please try again.');
    }
  }

  /**
   * Get clients by country
   * 
   * @param country Country to filter by
   * @returns Promise<Client[]> Clients in the country
   */
  async getClientsByCountry(country: string): Promise<Client[]> {
    try {
      const response = await fetch(`${this.baseUrl}/clients/country/${encodeURIComponent(country)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch clients by country: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching clients by country:', error);
      throw new Error('Failed to load clients by country. Please try again.');
    }
  }
}

/**
 * Default client service instance
 */
export const clientService = new ClientService();
