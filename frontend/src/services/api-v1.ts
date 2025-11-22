/**
 * API Client for v1 Backend API
 * Supabase-like interface for projects and files
 */

import axios, { AxiosError } from 'axios';

// Use relative URLs for API calls
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return '';
};

const API_BASE_URL = getApiBaseUrl();
const V1_BASE = `${API_BASE_URL}/api/v1`;

// Log API base URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL || '(relative - using Vite proxy)');
}

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: {
    message: string;
    code: string;
    details?: any;
  } | null;
  count?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
  files?: File[];
}

export interface File {
  id: string;
  projectId: string;
  name: string;
  path: string;
  content?: string;
  language: string;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionResponse {
  success: boolean;
  commands: Array<{
    type: string;
    x?: number;
    y?: number;
    angle?: number;
    penDown?: boolean;
    down?: boolean;
    r?: number;
    g?: number;
    b?: number;
    width?: number;
  }>;
  output: string;
  error: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateFileRequest {
  projectId: string;
  name: string;
  path: string;
  content?: string;
  language?: string;
}

export interface UpdateFileRequest {
  content?: string;
  name?: string;
  path?: string;
  language?: string;
}

export interface QueryParams {
  select?: string;
  order?: string;
  limit?: number;
  offset?: number;
  [key: string]: any; // Filters
}

// ============================================================================
// Helper Functions
// ============================================================================

function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<any>>;
    if (axiosError.response?.data?.error) {
      throw new Error(axiosError.response.data.error.message);
    }
    throw new Error(axiosError.message || 'API request failed');
  }
  throw error;
}

// ============================================================================
// Projects API
// ============================================================================

export const projectsApi = {
  /**
   * List all projects
   */
  async list(params?: QueryParams): Promise<Project[]> {
    try {
      const response = await axios.get<ApiResponse<Project[]>>(`${V1_BASE}/projects`, {
        params,
        timeout: 10000
      });
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Get project by ID
   */
  async get(id: string, includeFiles = false): Promise<Project> {
    try {
      const response = await axios.get<ApiResponse<Project>>(`${V1_BASE}/projects/${id}`, {
        params: includeFiles ? { includeFiles: 'true' } : {},
        timeout: 10000
      });
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('Project not found');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Create a new project
   */
  async create(data: CreateProjectRequest): Promise<Project> {
    try {
      const response = await axios.post<ApiResponse<Project>>(`${V1_BASE}/projects`, data, {
        timeout: 10000
      });
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('Failed to create project');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Update project
   */
  async update(id: string, updates: Partial<CreateProjectRequest>): Promise<Project> {
    try {
      const response = await axios.put<ApiResponse<Project>>(`${V1_BASE}/projects/${id}`, updates, {
        timeout: 10000
      });
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('Failed to update project');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Delete project
   */
  async delete(id: string): Promise<void> {
    try {
      const response = await axios.delete<ApiResponse<{ success: boolean }>>(`${V1_BASE}/projects/${id}`, {
        timeout: 10000
      });
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Duplicate project
   */
  async duplicate(id: string, newName?: string): Promise<Project> {
    try {
      const response = await axios.post<ApiResponse<Project>>(
        `${V1_BASE}/projects/${id}/duplicate`,
        newName ? { name: newName } : {},
        { timeout: 10000 }
      );
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('Failed to duplicate project');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Export project
   */
  async export(id: string): Promise<{ project: any; files: any[] }> {
    try {
      const response = await axios.get<ApiResponse<{ project: any; files: any[] }>>(
        `${V1_BASE}/projects/${id}/export`,
        { timeout: 10000 }
      );
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('Failed to export project');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Import project
   */
  async import(projectData: { project: any; files: any[] }): Promise<Project> {
    try {
      const response = await axios.post<ApiResponse<Project>>(
        `${V1_BASE}/projects/import`,
        projectData,
        { timeout: 10000 }
      );
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('Failed to import project');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  }
};

// ============================================================================
// Files API
// ============================================================================

export const filesApi = {
  /**
   * List files in a project
   */
  async list(projectId: string, params?: QueryParams): Promise<File[]> {
    try {
      const response = await axios.get<ApiResponse<File[]>>(`${V1_BASE}/files`, {
        params: { projectId, ...params },
        timeout: 10000
      });
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      return response.data.data || [];
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Get file by ID
   */
  async get(projectId: string, fileId: string): Promise<File> {
    try {
      const response = await axios.get<ApiResponse<File>>(`${V1_BASE}/files/${fileId}`, {
        params: { projectId },
        timeout: 10000
      });
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('File not found');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Create a new file
   */
  async create(data: CreateFileRequest): Promise<File> {
    try {
      const response = await axios.post<ApiResponse<File>>(`${V1_BASE}/files`, data, {
        timeout: 10000
      });
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('Failed to create file');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Update file
   */
  async update(projectId: string, fileId: string, updates: UpdateFileRequest): Promise<File> {
    try {
      const response = await axios.put<ApiResponse<File>>(
        `${V1_BASE}/files/${fileId}`,
        updates,
        {
          params: { projectId },
          timeout: 10000
        }
      );
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('Failed to update file');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Delete file
   */
  async delete(projectId: string, fileId: string): Promise<void> {
    try {
      const response = await axios.delete<ApiResponse<{ success: boolean }>>(
        `${V1_BASE}/files/${fileId}`,
        {
          params: { projectId },
          timeout: 10000
        }
      );
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Rename file
   */
  async rename(projectId: string, fileId: string, name: string, path?: string): Promise<File> {
    try {
      const response = await axios.patch<ApiResponse<File>>(
        `${V1_BASE}/files/${fileId}/rename`,
        { name, path },
        {
          params: { projectId },
          timeout: 10000
        }
      );
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('Failed to rename file');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  }
};

// ============================================================================
// Execute API
// ============================================================================

export const executeApi = {
  /**
   * Execute Logo code
   */
  async execute(options: {
    code?: string;
    fileId?: string;
    projectId?: string;
    reset?: boolean;
  }): Promise<ExecutionResponse> {
    try {
      const response = await axios.post<ApiResponse<ExecutionResponse>>(
        `${V1_BASE}/execute`,
        options,
        { timeout: 30000 } // Longer timeout for execution
      );
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      if (!response.data.data) {
        throw new Error('Execution failed');
      }
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  }
};

// ============================================================================
// Health Check
// ============================================================================

export const healthCheck = async (): Promise<{ status: string }> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`, {
      timeout: 5000
    });
    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Backend health check timed out');
    } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      throw new Error(`Cannot connect to backend at ${API_BASE_URL || 'current origin'}`);
    } else if (error.response) {
      throw new Error(`Backend returned error: ${error.response.status}`);
    } else {
      throw new Error('Backend is not available');
    }
  }
};

