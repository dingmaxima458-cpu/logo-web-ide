import axios from 'axios';

// Use relative URLs for API calls - this works with Vite proxy in dev
// and same-origin in production (when using nginx reverse proxy)
// For EC2 direct access, use the EC2 hostname via environment variable
const getApiBaseUrl = () => {
  // If VITE_API_URL is set, use it (for EC2 direct access)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Otherwise use relative URLs (works with Vite proxy in dev)
  // In production with nginx, this will use same origin
  return '';
};

const API_BASE_URL = getApiBaseUrl();
// Backend is now Node.js/Express (same port, different runtime)

export interface CodeRequest {
  code: string;
  reset?: boolean;
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
  }>;
  output: string;
  error: string;
}

export const executeCode = async (
  code: string,
  reset: boolean = true
): Promise<ExecutionResponse> => {
  try {
    const response = await axios.post<ExecutionResponse>(
      `${API_BASE_URL}/api/execute`,
      {
        code,
        reset,
      }
    );
    return response.data;
  } catch (error: any) {
    // If the request fails, return an error response object instead of throwing
    // This allows the App to handle both success and error responses consistently
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to execute code',
      commands: [],
      output: ''
    };
  }
};

export const healthCheck = async (): Promise<{ status: string }> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`);
    return response.data;
  } catch (error) {
    throw new Error('Backend is not available');
  }
};

