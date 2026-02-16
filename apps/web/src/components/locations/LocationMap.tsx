import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
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

interface LocationMapProps {
  lat: number;
  lng: number;
  accuracy?: number;
  height?: string;
  showAccuracyCircle?: boolean;
}

// Component to recenter map when position changes
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

export function LocationMap({ 
  lat, 
  lng, 
  accuracy, 
  height = '200px',
  showAccuracyCircle = true 
}: LocationMapProps) {
  const position: [number, number] = [lat, lng];
  
  return (
    <div 
      className="overflow-hidden rounded-lg border border-zinc-200" 
      style={{ height }}
    >
      <MapContainer
        center={position}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={position} zoom={16} />
        <Marker position={position} />
        {showAccuracyCircle && accuracy && (
          <Circle 
            center={position} 
            radius={accuracy}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
              weight: 2,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
