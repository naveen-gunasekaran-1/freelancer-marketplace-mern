// API Configuration
// Use relative URLs to leverage Vite's proxy in development
// In production or devtunnel, these will resolve to the configured URLs

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

// Helper function to build API URLs
export const getApiUrl = (path: string): string => {
  // If no API_BASE_URL is set, use relative paths (Vite proxy)
  if (!API_BASE_URL) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  // If API_BASE_URL is set (devtunnel/production), use absolute URLs
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Helper function for Socket.IO URL
export const getSocketUrl = (): string => {
  // If SOCKET_URL is set (devtunnel/production), use it
  if (SOCKET_URL) {
    return SOCKET_URL;
  }
  // Otherwise, use current origin (localhost with Vite proxy)
  return window.location.origin;
};
