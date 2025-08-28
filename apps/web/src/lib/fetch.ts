const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface FetchConfig extends RequestInit {
  params?: Record<string, string>;
  token?: string;
}

const buildUrl = (endpoint: string, params?: Record<string, string>) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
};

export async function get<T>(
  endpoint: string,
  config: FetchConfig = {}
): Promise<ApiResponse<T>> {
  const { params, token, ...fetchConfig } = config;
  const url = buildUrl(endpoint, params);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...config.headers,
    },
    ...fetchConfig,
  });

  
  let data: ApiResponse<T>; 
  try {
    data = await response.json();
  } catch (e) {
    console.error("GET: Failed to parse JSON response:", e);
    if (!response.ok) {
        data = { 
            statusCode: response.status, 
            message: `HTTP error ${response.status}`, 
            error: response.statusText || 'Failed to parse response' 
        } as ApiResponse<T>;
    } else {
         data = { 
            statusCode: response.status, 
            message: 'Success status but failed to parse response body.', 
            error: 'JSON Parse Error' 
        } as ApiResponse<T>;
    }
  }

  // If it's NOT ok AND it's NOT a 404, then throw an error
  if (!response.ok && response.status !== 404) {
    console.error(`GET: Throwing ApiError for status ${response.status}`);
    // Use the message from the parsed data if available, otherwise default
    const errorMsg = data?.message || data?.error || 'Something went wrong';
    throw new ApiError(response.status, errorMsg); // Throw for 500s, etc.
  }

  // For 2xx and 404, return the parsed data object.
  // Ensure the returned object has the expected structure, potentially adding status if missing.
  if (!data.statusCode) {
      data.statusCode = response.status;
  }
  return data;
}

export async function post<T, B = unknown>(
  endpoint: string,
  body?: B,
  config: FetchConfig = {}
): Promise<ApiResponse<T>> {
  const { params, token, ...fetchConfig } = config;
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...config.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...fetchConfig,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.statusCode, data.message || data.error || 'Something went wrong');
  }

  return data;
}

export async function postMedia<T>(
  endpoint: string,
  formData: FormData,
  config: Omit<FetchConfig, 'headers'> = {}
): Promise<ApiResponse<T>> {
  const { params, token, ...fetchConfig } = config;
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: formData,
    ...fetchConfig,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.statusCode, data.message || data.error || 'Something went wrong');
  }

  return data;
}

export async function patch<T, B = unknown>(
  endpoint: string,
  body?: B,
  config: FetchConfig = {}
): Promise<ApiResponse<T>> {
  const { params, token, ...fetchConfig } = config;
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...config.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...fetchConfig,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.statusCode, data.message || data.error || 'Something went wrong');
  }

  return data;
}

export async function del<T>(
  endpoint: string,
  body?: unknown,
  config: FetchConfig = {}
): Promise<ApiResponse<T>> {
  const { params, token, ...fetchConfig } = config;
  const url = buildUrl(endpoint, params);
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...config.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...fetchConfig,
    });
  
    const data = await response.json();
  
    if (!response.ok) {
      console.error('DELETE request failed:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new ApiError(data.statusCode, data.message || data.error || 'Something went wrong');
    }
  
    return data;
  } catch (error) {
    console.error('Error in DELETE request:', error);
    throw error;
  }
}

export async function put<T, B = unknown>(
  endpoint: string,
  body?: B,
  config: FetchConfig = {}
): Promise<ApiResponse<T>> {
  const { params, token, ...fetchConfig } = config;
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...config.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...fetchConfig,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.statusCode, data.message || data.error || 'Something went wrong');
  }

  return data;
}