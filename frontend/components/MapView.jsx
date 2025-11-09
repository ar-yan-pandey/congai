import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { getCongestionColor } from '../lib/utils';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function HeatmapLayer({ predictions, showHeatmap, onMapClick }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map || !predictions || predictions.length === 0) return;

    // Remove existing heatmap layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Add click handler to find nearest prediction
    const handleMapClick = (e) => {
      if (!predictions || predictions.length === 0) return;
      
      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;
      
      // Find nearest prediction using Euclidean distance
      let nearestPred = null;
      let minDistance = Infinity;
      
      predictions.forEach(pred => {
        if (!pred.location) return;
        const lat = pred.location.latitude;
        const lng = pred.location.longitude;
        const distance = Math.sqrt(
          Math.pow(lat - clickLat, 2) + Math.pow(lng - clickLng, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestPred = pred;
        }
      });
      
      if (nearestPred && onMapClick) {
        onMapClick(nearestPred);
      }
    };

    map.on('click', handleMapClick);

    // Only create heatmap if showHeatmap is true
    if (showHeatmap) {
      // Prepare heatmap data: [lat, lng, intensity]
      const heatData = predictions
        .filter(pred => pred.location && pred.congestion_score !== undefined)
        .map(pred => [
          pred.location.latitude,
          pred.location.longitude,
          pred.congestion_score // 0-1 intensity
        ]);

      if (heatData.length > 0) {
        // Create heatmap layer with custom gradient
        heatLayerRef.current = L.heatLayer(heatData, {
          radius: 50,
          blur: 35,
          maxZoom: 17,
          max: 0.7,  // Lower max for higher opacity
          minOpacity: 0.5,  // Minimum opacity
          gradient: {
            0.0: '#22c55e',  // Green (low congestion - 0-30%)
            0.3: '#84cc16',  // Light green
            0.5: '#eab308',  // Yellow (medium congestion - 30-60%)
            0.6: '#f59e0b',  // Amber
            0.8: '#ef4444',  // Red (high congestion - 60-80%)
            1.0: '#dc2626'   // Dark red (critical - 80-100%)
          }
        }).addTo(map);
      }
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
      map.off('click', handleMapClick);
    };
  }, [map, predictions, showHeatmap, onMapClick]);

  return null;
}

export default function MapView({ predictions, center, zoom, onMarkerClick, showHeatmap = true }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', cursor: 'pointer' }}
      className="z-0"
    >
      <MapUpdater center={center} zoom={zoom} />
      
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Heatmap Layer with click-to-find-nearest */}
      <HeatmapLayer 
        predictions={predictions} 
        showHeatmap={showHeatmap}
        onMapClick={onMarkerClick}
      />
    </MapContainer>
  );
}
