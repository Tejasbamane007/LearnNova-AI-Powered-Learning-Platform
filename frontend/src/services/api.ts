// Base API configuration
const API_URL = 'http://localhost:5000/api';

// Helper function to get the auth token
const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error: ${response.status} ${response.statusText}`);
    } catch (e) {
      // If we can't parse the JSON, just throw a generic error with the status
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
  }
  return response.json();
};

// Helper function to create a fetch request with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number = 30000) => {
  const controller = new AbortController();
  const { signal } = controller;
  
  // Create a timeout that will abort the fetch
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Generic API request function with authentication and timeout
const apiRequest = async (
  endpoint: string,
  method: string = 'GET',
  body?: any,
  timeout: number = 30000 // Default 30 second timeout
): Promise<any> => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    // Use a longer timeout for timetable generation (60 seconds)
    const actualTimeout = endpoint.includes('/timetable') && method === 'POST' ? 60000 : timeout;
    
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, config, actualTimeout);
    return handleResponse(response);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Request timed out:', endpoint);
      throw new Error('Request timed out. The server is taking too long to respond.');
    }
    console.error('API request error:', error);
    throw error;
  }
};

export default apiRequest;