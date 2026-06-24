/**
 * Project Service Tests
 * 
 * Basic tests to verify project service functionality.
 * These tests ensure the service methods work correctly.
 * 
 * @author Juan
 * @version 1.0
 */

import { projectService, ProjectData, Priority, ProjectStatus } from '../projectService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('ProjectService', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      const projectData: ProjectData = {
        name: 'Test Project',
        description: 'Test Description',
        priority: Priority.HIGH,
        clientId: 1,
        eventDate: new Date('2024-07-15')
      };

      const mockResponse = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        priority: Priority.HIGH,
        status: ProjectStatus.PLANNING
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await projectService.createProject(projectData);

      expect(fetch).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Project',
          description: 'Test Description',
          priority: Priority.HIGH,
          clientEntity: { id: 1 },
          startDate: '2024-07-15',
          endDate: '2024-07-15'
        })
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const projectData: ProjectData = {
        name: 'Test Project',
        priority: Priority.HIGH
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      });

      await expect(projectService.createProject(projectData)).rejects.toThrow('Failed to create project: Bad Request');
    });
  });

  describe('getAllProjects', () => {
    it('should fetch all projects successfully', async () => {
      const mockProjects = [
        { id: 1, name: 'Project 1', status: ProjectStatus.IN_PROGRESS },
        { id: 2, name: 'Project 2', status: ProjectStatus.COMPLETED }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects
      });

      const result = await projectService.getAllProjects();

      expect(fetch).toHaveBeenCalledWith('/api/projects', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(result).toEqual(mockProjects);
    });
  });

  describe('updateProjectStatus', () => {
    it('should update project status successfully', async () => {
      const projectId = 1;
      const newStatus = ProjectStatus.IN_PROGRESS;
      const mockResponse = { id: 1, name: 'Project 1', status: newStatus };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await projectService.updateProjectStatus(projectId, newStatus);

      expect(fetch).toHaveBeenCalledWith('/api/projects/1/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateProjectProgress', () => {
    it('should update project progress successfully', async () => {
      const projectId = 1;
      const progress = 75;
      const mockResponse = { id: 1, name: 'Project 1', progress: 75 };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await projectService.updateProjectProgress(projectId, progress);

      expect(fetch).toHaveBeenCalledWith('/api/projects/1/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: 75 })
      });
      expect(result).toEqual(mockResponse);
    });

    it('should validate progress range', async () => {
      await expect(projectService.updateProjectProgress(1, 150)).rejects.toThrow('Progress must be between 0 and 100');
      await expect(projectService.updateProjectProgress(1, -10)).rejects.toThrow('Progress must be between 0 and 100');
    });
  });
});
