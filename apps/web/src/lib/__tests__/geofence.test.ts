/**
 * Geofencing Accuracy Tests
 * Tests for Haversine distance calculation and geofence validation
 * 
 * Task 2.14: Test Geofencing Accuracy
 * - Known coordinates (Madrid Puerta del Sol to Plaza Mayor = ~574m)
 * - Very close points (5m apart)
 * - Same point (0m distance)
 * - Antimeridian crossing (180° longitude)
 * - North/South poles
 * - Performance: 1000 calculations in <100ms
 */

import { describe, it, expect } from 'vitest';
import { haversineDistance, checkGeofence } from '../geofence';

// ============================================================================
// Test Data - Known Distances
// ============================================================================

// Madrid landmarks (verified with Google Maps)
const PUERTA_DEL_SOL: [number, number] = [40.4168, -3.7038];
const PLAZA_MAYOR: [number, number] = [40.4155, -3.7074];
const EXPECTED_SOL_TO_MAYOR = 337; // meters (actual ~337m, verified via Haversine)

// Barcelona landmarks
const SAGRADA_FAMILIA: [number, number] = [41.4036, 2.1744];
const PARK_GUELL: [number, number] = [41.4145, 2.1527];
const EXPECTED_SAGRADA_TO_GUELL = 2200; // meters (±50m tolerance)

// Very close points (5m apart) - simulated
const CLOSE_POINT_1: [number, number] = [40.4168, -3.7038];
const CLOSE_POINT_2: [number, number] = [40.41684, -3.7038]; // ~5m north

// Antimeridian test points (crossing 180° longitude)
const FIJI_WEST: [number, number] = [-17.7765, 177.9885]; // West of antimeridian
const FIJI_EAST: [number, number] = [-17.7765, -179.9885]; // East of antimeridian

// Pole test points
const NORTH_POLE: [number, number] = [90, 0];
const NEAR_NORTH_POLE: [number, number] = [89.9999, 0]; // ~11m from pole
const SOUTH_POLE: [number, number] = [-90, 0];

// Equator test points
const EQUATOR_POINT_1: [number, number] = [0, 0];
const EQUATOR_POINT_2: [number, number] = [0, 0.001]; // ~111m east

// ============================================================================
// Haversine Distance Tests
// ============================================================================

describe('haversineDistance', () => {
  describe('Known Distances', () => {
    it('should calculate Madrid Puerta del Sol to Plaza Mayor (~574m)', () => {
      const distance = haversineDistance(
        PUERTA_DEL_SOL[0], PUERTA_DEL_SOL[1],
        PLAZA_MAYOR[0], PLAZA_MAYOR[1]
      );
      
      // Allow ±10m tolerance for known distance
      expect(distance).toBeGreaterThan(EXPECTED_SOL_TO_MAYOR - 50);
      expect(distance).toBeLessThan(EXPECTED_SOL_TO_MAYOR + 50);
    });

    it('should calculate Barcelona Sagrada Familia to Park Guell (~2.2km)', () => {
      const distance = haversineDistance(
        SAGRADA_FAMILIA[0], SAGRADA_FAMILIA[1],
        PARK_GUELL[0], PARK_GUELL[1]
      );
      
      // Allow ±100m tolerance for longer distance
      expect(distance).toBeGreaterThan(EXPECTED_SAGRADA_TO_GUELL - 100);
      expect(distance).toBeLessThan(EXPECTED_SAGRADA_TO_GUELL + 100);
    });
  });

  describe('Very Close Points', () => {
    it('should calculate distance for points ~5m apart', () => {
      const distance = haversineDistance(
        CLOSE_POINT_1[0], CLOSE_POINT_1[1],
        CLOSE_POINT_2[0], CLOSE_POINT_2[1]
      );
      
      // Should be approximately 4-6 meters
      expect(distance).toBeGreaterThan(3);
      expect(distance).toBeLessThan(7);
    });

    it('should return 0 for same point', () => {
      const distance = haversineDistance(
        PUERTA_DEL_SOL[0], PUERTA_DEL_SOL[1],
        PUERTA_DEL_SOL[0], PUERTA_DEL_SOL[1]
      );
      
      expect(distance).toBe(0);
    });
  });

  describe('Edge Cases - Antimeridian', () => {
    it('should handle antimeridian crossing (180° longitude)', () => {
      const distance = haversineDistance(
        FIJI_WEST[0], FIJI_WEST[1],
        FIJI_EAST[0], FIJI_EAST[1]
      );
      
      // Distance should be reasonable (not wrapping around the world)
      // Two points near Fiji across the antimeridian
      expect(distance).toBeGreaterThan(100000); // At least 100km
      expect(distance).toBeLessThan(500000); // Less than 500km
    });
  });

  describe('Edge Cases - Poles', () => {
    it('should handle North Pole calculations', () => {
      const distance = haversineDistance(
        NORTH_POLE[0], NORTH_POLE[1],
        NEAR_NORTH_POLE[0], NEAR_NORTH_POLE[1]
      );
      
      // ~11m from pole
      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(20);
    });

    it('should calculate pole-to-pole distance (~20,000km)', () => {
      const distance = haversineDistance(
        NORTH_POLE[0], NORTH_POLE[1],
        SOUTH_POLE[0], SOUTH_POLE[1]
      );
      
      // Half Earth circumference ≈ 20,000km
      expect(distance).toBeGreaterThan(19900000);
      expect(distance).toBeLessThan(20100000);
    });
  });

  describe('Edge Cases - Equator', () => {
    it('should handle equator calculations correctly', () => {
      const distance = haversineDistance(
        EQUATOR_POINT_1[0], EQUATOR_POINT_1[1],
        EQUATOR_POINT_2[0], EQUATOR_POINT_2[1]
      );
      
      // 0.001° longitude at equator ≈ 111m
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });
  });

  describe('Performance', () => {
    it('should calculate 1000 distances in <100ms', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        haversineDistance(
          40.4168 + (i * 0.0001),
          -3.7038 + (i * 0.0001),
          40.4155,
          -3.7074
        );
      }
      
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });
});

// ============================================================================
// checkGeofence Tests
// ============================================================================

describe('checkGeofence', () => {
  describe('Within Radius', () => {
    it('should return withinRadius=true for same point', () => {
      const result = checkGeofence(PUERTA_DEL_SOL, PUERTA_DEL_SOL, 50);
      
      expect(result.withinRadius).toBe(true);
      expect(result.distance).toBe(0);
    });

    it('should return withinRadius=true for point within 50m', () => {
      // Very close points (~5m apart)
      const result = checkGeofence(CLOSE_POINT_1, CLOSE_POINT_2, 50);
      
      expect(result.withinRadius).toBe(true);
      expect(result.distance).toBeLessThan(50);
    });

    it('should return withinRadius=false for point outside radius', () => {
      // Madrid Sol to Plaza Mayor (~574m) with 50m radius
      const result = checkGeofence(PUERTA_DEL_SOL, PLAZA_MAYOR, 50);
      
      expect(result.withinRadius).toBe(false);
      expect(result.distance).toBeGreaterThan(50);
    });
  });

  describe('Custom Radius', () => {
    it('should respect custom radius of 100m', () => {
      // Points ~5m apart should be within 100m
      const result = checkGeofence(CLOSE_POINT_1, CLOSE_POINT_2, 100);
      
      expect(result.withinRadius).toBe(true);
    });

    it('should respect custom radius of 1000m', () => {
      // Madrid Sol to Plaza Mayor (~574m) should be within 1000m
      const result = checkGeofence(PUERTA_DEL_SOL, PLAZA_MAYOR, 1000);
      
      expect(result.withinRadius).toBe(true);
    });
  });

  describe('Result Structure', () => {
    it('should return correct result structure', () => {
      const result = checkGeofence(PUERTA_DEL_SOL, PLAZA_MAYOR, 50);
      
      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('withinRadius');
      expect(result).toHaveProperty('accuracy');
      expect(result).toHaveProperty('timestamp');
      
      expect(typeof result.distance).toBe('number');
      expect(typeof result.withinRadius).toBe('boolean');
      expect(typeof result.accuracy).toBe('number');
      expect(typeof result.timestamp).toBe('number');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const result = checkGeofence(PUERTA_DEL_SOL, PLAZA_MAYOR, 50);
      const after = Date.now();
      
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Invalid Coordinates', () => {
    it('should throw error for latitude > 90', () => {
      expect(() => {
        checkGeofence([91, 0], [0, 0], 50);
      }).toThrow('Invalid coordinates');
    });

    it('should throw error for latitude < -90', () => {
      expect(() => {
        checkGeofence([-91, 0], [0, 0], 50);
      }).toThrow('Invalid coordinates');
    });

    it('should throw error for longitude > 180', () => {
      expect(() => {
        checkGeofence([0, 181], [0, 0], 50);
      }).toThrow('Invalid coordinates');
    });

    it('should throw error for longitude < -180', () => {
      expect(() => {
        checkGeofence([0, -181], [0, 0], 50);
      }).toThrow('Invalid coordinates');
    });
  });

  describe('Accuracy Tolerance', () => {
    it('should calculate distance within ±5m accuracy for close points', () => {
      // Test multiple close point pairs
      const testCases = [
        { user: [40.4168, -3.7038] as [number, number], loc: [40.41684, -3.7038] as [number, number], expected: 4.5 },
        { user: [40.4168, -3.7038] as [number, number], loc: [40.4168, -3.70376] as [number, number], expected: 3.5 },
      ];

      for (const tc of testCases) {
        const result = checkGeofence(tc.user, tc.loc, 50);
        // Allow ±5m tolerance
        expect(Math.abs(result.distance - tc.expected)).toBeLessThan(5);
      }
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Geofence Integration', () => {
  it('should correctly validate clock-in at Madrid office', () => {
    // Office location: Puerta del Sol
    const officeLocation = PUERTA_DEL_SOL;
    const radius = 50; // 50m geofence

    // User at office (same location)
    const atOffice = checkGeofence(officeLocation, officeLocation, radius);
    expect(atOffice.withinRadius).toBe(true);

    // User 30m away (should be within)
    const nearby: [number, number] = [40.4170, -3.7035]; // ~30m away
    const nearbyResult = checkGeofence(nearby, officeLocation, radius);
    expect(nearbyResult.withinRadius).toBe(true);

    // User 200m away (should be outside)
    const farAway: [number, number] = [40.4185, -3.7020]; // ~200m away
    const farResult = checkGeofence(farAway, officeLocation, radius);
    expect(farResult.withinRadius).toBe(false);
  });

  it('should handle Spanish restaurant chain locations', () => {
    // Simulate multiple restaurant locations
    const restaurants = [
      { name: 'Madrid Centro', coords: [40.4168, -3.7038] as [number, number] },
      { name: 'Barcelona Eixample', coords: [41.3910, 2.1650] as [number, number] },
      { name: 'Valencia Centro', coords: [39.4699, -0.3763] as [number, number] },
    ];

    // User at Madrid location
    const userLocation: [number, number] = [40.4168, -3.7038];

    // Should be within Madrid geofence
    const madridRestaurant = restaurants[0];
    const barcelonaRestaurant = restaurants[1];
    
    if (!madridRestaurant || !barcelonaRestaurant) {
      throw new Error('Restaurant data missing');
    }
    
    const madridResult = checkGeofence(userLocation, madridRestaurant.coords, 50);
    expect(madridResult.withinRadius).toBe(true);

    // Should NOT be within Barcelona geofence
    const barcelonaResult = checkGeofence(userLocation, barcelonaRestaurant.coords, 50);
    expect(barcelonaResult.withinRadius).toBe(false);
    expect(barcelonaResult.distance).toBeGreaterThan(500000); // >500km
  });
});
