/**
 * Client Service Tests
 * 
 * Basic tests to verify client service functionality.
 * These tests ensure the service methods work correctly.
 * 
 * @author Juan
 * @version 1.0
 */

import { clientService, Client } from '../clientService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('ClientService', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('getAllClients', () => {
    it('should fetch all clients successfully', async () => {
      const mockClients: Client[] = [
        { id: 1, name: 'Client 1', industry: 'Technology', country: 'USA' },
        { id: 2, name: 'Client 2', industry: 'Healthcare', country: 'Canada' }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClients
      });

      const result = await clientService.getAllClients();

      expect(fetch).toHaveBeenCalledWith('/api/clients', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockClients);
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await expect(clientService.getAllClients()).rejects.toThrow('Failed to load clients. Please try again.');
    });
  });

  describe('createClient', () => {
    it('should create a new client successfully', async () => {
      const newClient = { name: 'New Client', industry: 'Technology', country: 'USA' };
      const createdClient: Client = { id: 1, ...newClient };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => createdClient
      });

      const result = await clientService.createClient(newClient);

      expect(fetch).toHaveBeenCalledWith('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      });
      expect(result).toEqual(createdClient);
    });

    it('should handle duplicate client name', async () => {
      const newClient = { name: 'Existing Client', industry: 'Technology' };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409
      });

      await expect(clientService.createClient(newClient)).rejects.toThrow('A client with this name already exists');
    });
  });

  describe('searchClients', () => {
    it('should search clients by name', async () => {
      const searchResults: Client[] = [
        { id: 1, name: 'Acme Corp', industry: 'Technology' }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => searchResults
      });

      const result = await clientService.searchClients('Acme');

      expect(fetch).toHaveBeenCalledWith('/api/clients/search?name=Acme', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(searchResults);
    });
  });
});
