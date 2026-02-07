import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

  return (
    <div 
      className="overflow-hidden rounded-lg border border-zinc-800" 
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={position ? 15 : 6}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationSelect={handleLocationSelect} />
        {position && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}
