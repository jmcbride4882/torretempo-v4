import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Maximize2, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';

// Fix for default marker icons in production builds
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  lat?: number;
  lng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapPicker({ lat, lng, onLocationSelect, height = '400px' }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    lat && lng ? [lat, lng] : null
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Default center: Madrid, Spain
  const defaultCenter: [number, number] = [40.4168, -3.7038];
  const center = position || defaultCenter;

  useEffect(() => {
    if (lat && lng) {
      setPosition([lat, lng]);
    }
  }, [lat, lng]);

  const handleLocationSelect = (newLat: number, newLng: number) => {
    setPosition([newLat, newLng]);
    onLocationSelect(newLat, newLng);
  };

  const MapView = ({ fullscreen = false }: { fullscreen?: boolean }) => (
    <MapContainer
      center={center}
      zoom={position ? 15 : 6}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
      key={fullscreen ? 'fullscreen' : 'inline'} // Force remount for fullscreen
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onLocationSelect={handleLocationSelect} />
      {position && <Marker position={position} />}
    </MapContainer>
  );

  return (
    <>
      {/* Inline map view */}
      <div className="relative">
        <div 
          className="overflow-hidden rounded-lg border border-slate-200" 
          style={{ height }}
        >
          <MapView />
        </div>
        
        {/* Expand button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsFullscreen(true)}
          className="absolute right-2 top-2 z-[1000] gap-2 shadow-lg"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="hidden sm:inline">Expand Map</span>
        </Button>
      </div>

      {/* Fullscreen map modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-white">
          {/* Header */}
          <div className="absolute left-0 right-0 top-0 z-[10000] flex items-center justify-between border-b border-slate-200 bg-white p-4">
            <div>
              <h3 className="font-semibold text-slate-900">Select Location</h3>
              <p className="text-xs text-slate-500">Tap on the map to set coordinates</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              className="gap-2"
            >
              <X className="h-5 w-5" />
              Close
            </Button>
          </div>

          {/* Full-height map */}
          <div className="h-full w-full pt-[73px]">
            <MapView fullscreen />
          </div>

          {/* Coordinates display */}
          {position && (
            <div className="absolute bottom-0 left-0 right-0 z-[10000] border-t border-slate-200 bg-white p-4">
              <div className="text-center">
                <p className="text-xs text-slate-500">Selected Coordinates</p>
                <p className="font-mono text-sm text-slate-900">
                  {position[0].toFixed(6)}, {position[1].toFixed(6)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
