import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Polygon, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { AircraftPosition, BoundaryData } from '../utils/kmlParser';
import './MiniMap.css';

interface MiniMapProps {
  positions: AircraftPosition[];
  boundaries: BoundaryData[];
  windFieldCenter?: { lat: number; lng: number } | null;
}

// 自动适应视图
function AutoFitBounds({ positions, boundaries }: { positions: AircraftPosition[]; boundaries: BoundaryData[] }) {
  const map = useMap();
  
  useEffect(() => {
    const allCoords: [number, number][] = [];
    
    positions.forEach(p => {
      allCoords.push([p.position.lat, p.position.lng]);
    });
    
    boundaries.forEach(b => {
      b.coordinates.forEach(c => {
        allCoords.push([c.lat, c.lng]);
      });
    });
    
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds.pad(0.2), { animate: false });
    }
  }, [positions, boundaries, map]);
  
  return null;
}

// 创建小地图上的机位点图标
const createSmallPositionIcon = () => {
  return L.divIcon({
    className: 'mini-position-marker',
    html: `<div style="
      width: 4px;
      height: 4px;
      background-color: #3498db;
      border-radius: 50%;
    "></div>`,
    iconSize: [4, 4],
    iconAnchor: [2, 2],
  });
};

// 创建风场中心图标
const createCenterIcon = () => {
  return L.divIcon({
    className: 'wind-field-center-marker',
    html: `<div style="
      width: 12px;
      height: 12px;
      background-color: rgba(231, 76, 60, 0.7);
      border: 2px solid #c0392b;
      border-radius: 50%;
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

export default function MiniMap({ positions, boundaries, windFieldCenter }: MiniMapProps) {
  const defaultCenter: [number, number] = windFieldCenter 
    ? [windFieldCenter.lat, windFieldCenter.lng]
    : [35.0, 105.0];

  return (
    <div className="mini-map-container">
      <div className="mini-map-header">风场远视图</div>
      <MapContainer
        center={defaultCenter}
        zoom={8}
        style={{ height: '200px', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />
        
        <AutoFitBounds positions={positions} boundaries={boundaries} />
        
        {/* 显示边界概览 */}
        {boundaries.map((boundary) => {
          const coords: [number, number][] = boundary.coordinates.map(c => [c.lat, c.lng]);
          
          if (boundary.type === 'polygon') {
            return (
              <Polygon
                key={boundary.id}
                positions={coords}
                pathOptions={{
                  color: '#e74c3c',
                  weight: 1,
                  fillColor: '#e74c3c',
                  fillOpacity: 0.2,
                }}
              />
            );
          } else {
            return (
              <Polyline
                key={boundary.id}
                positions={coords}
                pathOptions={{
                  color: '#e74c3c',
                  weight: 1,
                }}
              />
            );
          }
        })}
        
        {/* 显示机位点 */}
        {positions.map((position) => (
          <Marker
            key={position.id}
            position={[position.position.lat, position.position.lng]}
            icon={createSmallPositionIcon()}
          />
        ))}
        
        {/* 显示风场中心 */}
        {windFieldCenter && (
          <Marker
            position={[windFieldCenter.lat, windFieldCenter.lng]}
            icon={createCenterIcon()}
          />
        )}
      </MapContainer>
    </div>
  );
}
