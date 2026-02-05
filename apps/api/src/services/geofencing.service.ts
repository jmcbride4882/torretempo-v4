/**
 * Geofencing Service
 * Handles geolocation validation and distance calculations
 */

interface Location {
  lat: number;
  lng: number;
  geofence_radius?: number | null;
}

interface GeofenceValidation {
  valid: boolean;
  distance: number;
  withinRadius: boolean;
  location: Location;
  message?: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 * 
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if user coordinates are within location's geofence radius
 * 
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param location - Location object with lat, lng, geofence_radius
 * @returns True if within geofence or geofence not set
 */
export function isWithinGeofence(
  userLat: number,
  userLng: number,
  location: Location
): boolean {
  // If location doesn't have coordinates or geofence_radius, skip validation
  if (!location.lat || !location.lng || !location.geofence_radius) {
    return true;
  }

  const distance = calculateDistance(userLat, userLng, location.lat, location.lng);
  return distance <= location.geofence_radius;
}

/**
 * Validate geofence with detailed response
 * 
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param location - Location object with geofence settings
 * @returns Validation result with distance and status
 */
export function validateGeofence(
  userLat: number,
  userLng: number,
  location: Location
): GeofenceValidation {
  // If no geofence configured, validation passes
  if (!location.lat || !location.lng || !location.geofence_radius) {
    return {
      valid: true,
      distance: 0,
      withinRadius: true,
      location,
      message: 'Geofence not configured for this location',
    };
  }

  const distance = calculateDistance(userLat, userLng, location.lat, location.lng);
  const withinRadius = distance <= location.geofence_radius;

  return {
    valid: withinRadius,
    distance: Math.round(distance),
    withinRadius,
    location,
    message: withinRadius
      ? `Within geofence (${Math.round(distance)}m from location)`
      : `Outside geofence (${Math.round(distance)}m away, maximum ${location.geofence_radius}m)`,
  };
}

/**
 * Format distance for display
 * 
 * @param meters - Distance in meters
 * @returns Formatted string (e.g., "150m" or "1.2km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Check if coordinates are valid
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns True if coordinates are valid
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
}
