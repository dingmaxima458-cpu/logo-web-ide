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

// Log API base URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL || '(relative - using Vite proxy)');
}

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
    width?: number;
  }>;
  output: string;
  error: string;
}

export const executeCode = async (
  code: string,
  reset: boolean = true
): Promise<ExecutionResponse> => {
  const url = `${API_BASE_URL}/api/execute`;
  const requestBody = { code, reset };
  
  console.log('[API] executeCode called');
  console.log('[API] URL:', url);
  console.log('[API] Request body:', { code: code.substring(0, 100) + (code.length > 100 ? '...' : ''), reset });
  console.log('[API] API_BASE_URL:', API_BASE_URL);
  
  try {
    console.log('[API] Making POST request...');
    const response = await axios.post<ExecutionResponse>(
      url,
      requestBody,
      {
        timeout: 10000, // 10 second timeout
      }
    );
    console.log('[API] Response received:', {
      status: response.status,
      success: response.data.success,
      commandsCount: response.data.commands?.length || 0,
      hasError: !!response.data.error,
      error: response.data.error
    });
    return response.data;
  } catch (error: any) {
    console.error('[API] Request failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      url: url
    });
    // Enhanced error handling for network issues
    let errorMessage = 'Failed to execute code';
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = 'Request timeout: Backend did not respond in time. Is the backend running?';
    } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      errorMessage = `Network Error: Cannot connect to backend at ${API_BASE_URL || 'current origin'}. Check if backend is running and accessible.`;
    } else if (error.response) {
      // Server responded with error status
      errorMessage = error.response.data?.error || `Server error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = `No response from backend. Check if backend is running at ${API_BASE_URL || 'current origin'}`;
    } else {
      errorMessage = error.message || 'Failed to execute code';
    }
    
    return {
      success: false,
      error: errorMessage,
      commands: [],
      output: ''
    };
  }
};

export const healthCheck = async (): Promise<{ status: string }> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`, {
      timeout: 5000, // 5 second timeout for health check
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

