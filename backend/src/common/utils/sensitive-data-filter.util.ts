/**
 * Utility to filter sensitive data from objects before logging
 */

const SENSITIVE_FIELDS = [
  'password',
  'confirmPassword',
  'accessToken',
  'refreshToken',
  'token',
  'secret',
  'apiKey',
  'privateKey',
  'creditCard',
  'ssn',
];

const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
];

/**
 * Recursively filters sensitive data from an object
 * @param obj - Object to filter
 * @param depth - Current recursion depth (prevents infinite loops)
 * @returns Filtered object with sensitive fields masked
 */
export function filterSensitiveData(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_REACHED]';
  }

  // Handle null or undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => filterSensitiveData(item, depth + 1));
  }

  // Handle objects
  const filtered: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if field is sensitive
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      filtered[key] = '[REDACTED]';
      continue;
    }

    // Check if it's a header object and contains sensitive headers
    if (key === 'headers' && typeof value === 'object' && value !== null) {
      filtered[key] = filterHeaders(value);
      continue;
    }

    // Recursively filter nested objects
    if (typeof value === 'object' && value !== null) {
      filtered[key] = filterSensitiveData(value, depth + 1);
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Filters sensitive headers from a headers object
 * @param headers - Headers object to filter
 * @returns Filtered headers with sensitive ones masked
 */
function filterHeaders(headers: any): any {
  const filtered: any = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_HEADERS.includes(lowerKey)) {
      filtered[key] = '[REDACTED]';
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Extracts safe request information for logging
 * @param request - Express request object
 * @returns Safe request data for logging
 */
export function extractSafeRequestData(request: any): any {
  return {
    method: request.method,
    url: request.url,
    headers: filterHeaders(request.headers || {}),
    ip: request.ip,
    userAgent: request.get('user-agent'),
    body: filterSensitiveData(request.body || {}),
    query: filterSensitiveData(request.query || {}),
    params: request.params || {},
  };
}
