import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to execute code'
    );
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

