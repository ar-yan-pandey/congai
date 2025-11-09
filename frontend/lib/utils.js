import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Get color for congestion score
 */
export function getCongestionColor(score) {
  if (score >= 0.9) return '#DC2626'; // red-600 - critical
  if (score >= 0.8) return '#EA580C'; // orange-600 - high
  if (score >= 0.6) return '#F59E0B'; // amber-500 - medium
  if (score >= 0.3) return '#EAB308'; // yellow-500 - low-medium
  return '#22C55E'; // green-500 - low
}

/**
 * Get risk level badge classes
 */
export function getRiskClasses(riskLevel) {
  const baseClasses = 'px-3 py-1 rounded-full text-sm font-semibold';
  
  switch (riskLevel) {
    case 'critical':
      return `${baseClasses} bg-red-100 text-red-800 border border-red-300`;
    case 'high':
      return `${baseClasses} bg-orange-100 text-orange-800 border border-orange-300`;
    case 'medium':
      return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-300`;
    case 'low':
    default:
      return `${baseClasses} bg-green-100 text-green-800 border border-green-300`;
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Download JSON data
 */
export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate random organic pattern of locations for heatmap
 */
export function generateLocationGrid(centerLat, centerLon, gridSize = 10, spacing = 0.01) {
  const locations = [];
  const totalPoints = gridSize * gridSize;
  const maxRadius = (gridSize / 2) * spacing;
  
  // Add center point
  locations.push({
    latitude: centerLat,
    longitude: centerLon,
  });
  
  // Generate random points with organic distribution
  for (let i = 0; i < totalPoints - 1; i++) {
    // Use square root for more points near center (natural clustering)
    const r = Math.sqrt(Math.random()) * maxRadius;
    const theta = Math.random() * 2 * Math.PI;
    
    // Add some randomness to radius for organic feel
    const radiusJitter = (Math.random() - 0.5) * spacing * 0.3;
    const angleJitter = (Math.random() - 0.5) * 0.4;
    
    const lat = centerLat + (r + radiusJitter) * Math.cos(theta + angleJitter);
    const lon = centerLon + (r + radiusJitter) * Math.sin(theta + angleJitter);
    
    locations.push({
      latitude: lat,
      longitude: lon,
    });
  }
  
  return locations;
}
