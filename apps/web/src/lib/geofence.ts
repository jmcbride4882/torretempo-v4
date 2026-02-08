/**
 * Geofencing Validation Logic
 * Implements Haversine distance calculation and geofence validation
 * for clock-in location verification (Spanish labor law compliance)
 */

/**
 * Geolocation result from browser Geolocation API
 */
export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  timestamp: number;
}

/**
 * Geofence validation result
 */
export interface GeofenceResult {
  distance: number; // meters
  withinRadius: boolean;
  accuracy: number; // meters (GPS accuracy)
  timestamp: number;
}

/**
 * Calculate distance between two points on Earth using Haversine formula
 *
 * The Haversine formula calculates the great-circle distance between two points
 * on a sphere given their latitudes and longitudes. This is more accurate than
 * Euclidean distance for geographic coordinates.
 *
 * Formula:
 * a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
 * c = 2 × atan2(√a, √(1−a))
 * d = R × c
 * where R = 6371 km (Earth mean radius)
 *
 * @param lat1 - Latitude of point 1 in degrees (-90 to 90)
 * @param lon1 - Longitude of point 1 in degrees (-180 to 180)
 * @param lat2 - Latitude of point 2 in degrees (-90 to 90)
 * @param lon2 - Longitude of point 2 in degrees (-180 to 180)
 * @returns Distance in meters
 * @throws Error if coordinates are invalid
 *
 * @example
 * // Distance between Madrid (40.4168, -3.7038) and Barcelona (41.3851, 2.1734)
 * const distance = haversineDistance(40.4168, -3.7038, 41.3851, 2.1734);
 * console.log(`Distance: ${distance.toFixed(0)}m`); // ~560,000m (560km)
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Earth radius in meters (mean radius)
  const R = 6371e3;

  // Convert degrees to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  return distance;
}

/**
 * Check if user is within geofence radius
 *
 * Validates that a user's location is within a specified radius of a target location.
 * Used for clock-in validation to ensure employees are at the correct work site.
 *
 * Edge cases handled:
 * - Poles (±90° latitude): Haversine formula handles correctly
 * - Antimeridian (180° longitude): Δλ calculation handles wrap-around
 * - Equator (0° latitude): cos(0) = 1, formula works correctly
 * - Same point: distance = 0, withinRadius = true
 * - Invalid coordinates: Throws error with descriptive message
 *
 * @param userCoords - User's [latitude, longitude] in degrees
 * @param locationCoords - Location's [latitude, longitude] in degrees
 * @param radiusMeters - Geofence radius in meters (default: 50, Spanish labor law standard)
 * @returns GeofenceResult with distance and validation status
 * @throws Error if coordinates are invalid (lat > ±90° or lon > ±180°)
 *
 * @example
 * // Check if user at (40.4168, -3.7038) is within 50m of office at (40.4165, -3.7040)
 * const result = checkGeofence([40.4168, -3.7038], [40.4165, -3.7040], 50);
 * console.log(`Distance: ${result.distance.toFixed(2)}m`);
 * console.log(`Within radius: ${result.withinRadius}`); // true if distance <= 50m
 */
export function checkGeofence(
  userCoords: [number, number],
  locationCoords: [number, number],
  radiusMeters: number = 50
): GeofenceResult {
  const [userLat, userLon] = userCoords;
  const [locLat, locLon] = locationCoords;

  // Validate coordinates
  if (
    Math.abs(userLat) > 90 ||
    Math.abs(locLat) > 90 ||
    Math.abs(userLon) > 180 ||
    Math.abs(locLon) > 180
  ) {
    throw new Error(
      `Invalid coordinates: lat must be ±90°, lon must be ±180°. Got: (${userLat}, ${userLon}) and (${locLat}, ${locLon})`
    );
  }

  const distance = haversineDistance(userLat, userLon, locLat, locLon);

  return {
    distance,
    withinRadius: distance <= radiusMeters,
    accuracy: 0, // Will be set from GPS accuracy
    timestamp: Date.now(),
  };
}

/**
 * Get user's current position using browser Geolocation API
 *
 * Requests the user's current geographic position with high accuracy.
 * Uses a 10-second timeout to prevent hanging requests.
 *
 * @param options - Optional PositionOptions for geolocation API
 * @returns Promise resolving to GeolocationResult with lat/lon/accuracy
 * @throws Error if geolocation is not supported or permission denied
 *
 * @example
 * try {
 *   const position = await getCurrentPosition();
 *   console.log(`Lat: ${position.latitude}, Lon: ${position.longitude}`);
 *   console.log(`Accuracy: ±${position.accuracy}m`);
 * } catch (error) {
 *   console.error('Geolocation failed:', error);
 * }
 */
export function getCurrentPosition(
  options?: PositionOptions
): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported in this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0, // Don't use cached position
        ...options,
      }
    );
  });
}

/**
 * Validate user location within geofence using browser geolocation
 *
 * Combines getCurrentPosition() and checkGeofence() to perform a complete
 * geofence validation workflow:
 * 1. Request user's current position from browser
 * 2. Calculate distance to target location
 * 3. Return validation result with GPS accuracy
 *
 * Used for clock-in validation to ensure employees are at the correct work site.
 *
 * @param locationCoords - Location's [latitude, longitude] in degrees
 * @param radiusMeters - Geofence radius in meters (default: 50)
 * @returns Promise resolving to GeofenceResult with distance and validation
 * @throws Error if geolocation fails or coordinates are invalid
 *
 * @example
 * // Validate clock-in at Madrid office (50m radius)
 * try {
 *   const result = await validateGeofence([40.4168, -3.7038], 50);
 *   if (result.withinRadius) {
 *     console.log('Clock-in allowed: within geofence');
 *   } else {
 *     console.log(`Clock-in denied: ${result.distance.toFixed(0)}m away from office`);
 *   }
 * } catch (error) {
 *   console.error('Geolocation failed:', error);
 *   // Fallback: allow manual location selection or PIN entry
 * }
 */
export async function validateGeofence(
  locationCoords: [number, number],
  radiusMeters: number = 50
): Promise<GeofenceResult> {
  const userPosition = await getCurrentPosition();

  const result = checkGeofence(
    [userPosition.latitude, userPosition.longitude],
    locationCoords,
    radiusMeters
  );

  return {
    ...result,
    accuracy: userPosition.accuracy,
  };
}
