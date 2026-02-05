// @ts-nocheck - TODO: Fix Drizzle type assertions
import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { locations } from '../db/schema.js';

const router = Router();

/**
 * GET /api/v1/org/:slug/locations
 * List all locations for the organization
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;

    const allLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.organization_id, organizationId))
      .orderBy(locations.name);

    res.json({
      locations: allLocations,
      total: allLocations.length,
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ message: 'Failed to fetch locations' });
  }
});

/**
 * GET /api/v1/org/:slug/locations/:id
 * Get a specific location by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const id = req.params.id as string;

    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.organization_id, organizationId)))
      .limit(1);

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json({ location });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ message: 'Failed to fetch location' });
  }
});

/**
 * POST /api/v1/org/:slug/locations
 * Create a new location
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const { name, address, lat, lng, geofence_radius } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Create location
    const [newLocation] = await db
      .insert(locations)
      .values({
        organization_id: organizationId,
        name,
        address: address || null,
        lat: lat || null,
        lng: lng || null,
        geofence_radius: geofence_radius || null,
      })
      .returning();

    res.status(201).json({
      message: 'Location created successfully',
      location: newLocation,
    });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ message: 'Failed to create location' });
  }
});

/**
 * PUT /api/v1/org/:slug/locations/:id
 * Update a location
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const id = req.params.id as string;
    const { name, address, lat, lng, geofence_radius } = req.body;

    // Check if location exists and belongs to org
    const [existingLocation] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.organization_id, organizationId)))
      .limit(1);

    if (!existingLocation) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // Update location
    const [updatedLocation] = await db
      .update(locations)
      .set({
        name: name ?? existingLocation.name,
        address: address !== undefined ? address : existingLocation.address,
        lat: lat !== undefined ? lat : existingLocation.lat,
        lng: lng !== undefined ? lng : existingLocation.lng,
        geofence_radius: geofence_radius !== undefined ? geofence_radius : existingLocation.geofence_radius,
      })
      .where(and(eq(locations.id, id), eq(locations.organization_id, organizationId)))
      .returning();

    res.json({
      message: 'Location updated successfully',
      location: updatedLocation,
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Failed to update location' });
  }
});

/**
 * DELETE /api/v1/org/:slug/locations/:id
 * Delete a location
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const id = req.params.id as string;

    // Check if location exists and belongs to org
    const [existingLocation] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.organization_id, organizationId)))
      .limit(1);

    if (!existingLocation) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // TODO: Check if location is used in any shifts before deleting
    // For now, we'll allow deletion

    await db
      .delete(locations)
      .where(and(eq(locations.id, id), eq(locations.organization_id, organizationId)));

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ message: 'Failed to delete location' });
  }
});

export default router;
