import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polygon, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AircraftPosition, BoundaryData } from '../utils/kmlParser';

// 修复Leaflet默认图标问题
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapViewProps {
  positions: AircraftPosition[];
  boundaries: BoundaryData[];
  windTowerCoord?: { lat: number; lng: number } | null;
  showWindTowerCircle?: boolean;
  showWindTowerLabel?: boolean;
  windTowerStyle?: { size: number; color: string };
  markerColors: {
    current: string;
    future: string;
    modified: string;
  };
  positionColors?: Record<string, string>;
  onUpdatePositionColor?: (id: string, color: string) => void;
  onResetPositionColor?: (id: string) => void;
}

// 自定义图标颜色
const createIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 20px;
      height: 20px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// 测风塔图标（可配置大小和颜色）
const createWindTowerIcon = (size: number, color: string) => {
  return L.divIcon({
    className: 'wind-tower-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border: 3px solid #8e44ad;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${Math.max(12, size - 14)}px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    ">🗼</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// 地图自适应组件
function MapBounds({ positions, boundaries }: { positions: AircraftPosition[]; boundaries: BoundaryData[] }) {
  const map = useMap();
  
  useEffect(() => {
    const allCoords: [number, number][] = [];
    
    // 添加机位点坐标
    positions.forEach(p => {
      allCoords.push([p.position.lat, p.position.lng]);
    });
    
    // 添加边界坐标
    boundaries.forEach(b => {
      b.coordinates.forEach(c => {
        allCoords.push([c.lat, c.lng]);
      });
    });
    
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, boundaries, map]);
  
  return null;
}

export default function MapView({ 
  positions, 
  boundaries, 
  windTowerCoord,
  showWindTowerCircle = true,
  showWindTowerLabel = true,
  windTowerStyle,
  markerColors,
  positionColors,
  onUpdatePositionColor,
  onResetPositionColor,
}: MapViewProps) {
  // 默认中心点（中国中部）
  const defaultCenter: [number, number] = [35.0, 105.0];
  const defaultZoom = 6;

  // 计算测风塔到最近风机的距离（米）及最近风机位置
  let nearestDistance: number | null = null;
  let nearestPositionLatLng: L.LatLng | null = null;

  if (windTowerCoord && positions.length > 0) {
    const towerLatLng = L.latLng(windTowerCoord.lat, windTowerCoord.lng);
    positions.forEach((p) => {
      const posLatLng = L.latLng(p.position.lat, p.position.lng);
      const d = towerLatLng.distanceTo(posLatLng); // 单位：米
      if (nearestDistance === null || d < nearestDistance) {
        nearestDistance = d;
        nearestPositionLatLng = posLatLng;
      }
    });
  }

  // 距离标注的位置：取测风塔与最近风机的中点
  let labelPosition: [number, number] | null = null;
  if (windTowerCoord && nearestPositionLatLng) {
    labelPosition = [
      (windTowerCoord.lat + nearestPositionLatLng.lat) / 2,
      (windTowerCoord.lng + nearestPositionLatLng.lng) / 2,
    ];
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%' }}
    >
      {/* 地形图层 - 使用OpenTopoMap */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        maxZoom={17}
      />
      
      <MapBounds positions={positions} boundaries={boundaries} />
      
      {/* 显示边界 */}
      {boundaries.map((boundary) => {
        const coords: [number, number][] = boundary.coordinates.map(c => [c.lat, c.lng]);
        
        if (boundary.type === 'polygon') {
          return (
            <Polygon
              key={boundary.id}
              positions={coords}
              pathOptions={{
                color: '#e74c3c',
                weight: 2,
                fillColor: '#e74c3c',
                fillOpacity: 0.15,
              }}
            >
              <Popup>
                <div>
                  <h3>{boundary.name}</h3>
                  <p><strong>类型:</strong> 边界区域</p>
                  {boundary.description && <p>{boundary.description}</p>}
                  <p><strong>顶点数:</strong> {boundary.coordinates.length}</p>
                </div>
              </Popup>
            </Polygon>
          );
        } else {
          return (
            <Polyline
              key={boundary.id}
              positions={coords}
              pathOptions={{
                color: '#e74c3c',
                weight: 2,
              }}
            >
              <Popup>
                <div>
                  <h3>{boundary.name}</h3>
                  <p><strong>类型:</strong> 边界线</p>
                  {boundary.description && <p>{boundary.description}</p>}
                  <p><strong>顶点数:</strong> {boundary.coordinates.length}</p>
                </div>
              </Popup>
            </Polyline>
          );
        }
      })}
      
      {/* 显示所有机位点 */}
      {positions.map((position) => (
        <Marker
          key={position.id}
          position={[position.position.lat, position.position.lng]}
          icon={createIcon(
            positionColors?.[position.id] ??
              markerColors[position.status] ??
              '#6c757d'
          )}
        >
          <Popup>
            <div>
              <h3>{position.name}</h3>
              <p><strong>状态:</strong> {
                position.status === 'current' ? '现有机位点' :
                position.status === 'future' ? '未来机位点' :
                '修改的机位点'
              }</p>
              {position.description && <p>{position.description}</p>}
              <p>
                <strong>坐标:</strong> {position.position.lat.toFixed(6)}, {position.position.lng.toFixed(6)}
              </p>
              {position.position.alt !== undefined && (
                <p><strong>海拔:</strong> {position.position.alt.toFixed(2)}m</p>
              )}
              {onUpdatePositionColor && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>单个机位点颜色:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="color"
                      value={
                        positionColors?.[position.id] ??
                        markerColors[position.status] ??
                        '#6c757d'
                      }
                      onChange={(e) =>
                        onUpdatePositionColor(position.id, e.target.value)
                      }
                      style={{ width: 32, height: 20, padding: 0, border: 'none', background: 'transparent' }}
                    />
                    {positionColors?.[position.id] && onResetPositionColor && (
                      <button
                        type="button"
                        onClick={() => onResetPositionColor(position.id)}
                        style={{
                          fontSize: '12px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #ccc',
                          background: '#f8f9fa',
                          cursor: 'pointer',
                        }}
                      >
                        恢复批量颜色
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* 显示测风塔及与最近风机的距离圆 */}
      {windTowerCoord && nearestDistance && nearestDistance > 0 && (
        <>
          {showWindTowerCircle && (
            <Circle
              center={[windTowerCoord.lat, windTowerCoord.lng]}
              radius={nearestDistance}
              pathOptions={{
                color: windTowerStyle?.color || '#9b59b6',
                weight: 2,
                fillColor: windTowerStyle?.color || '#9b59b6',
                fillOpacity: 0.15,
                dashArray: '5, 5',
              }}
            >
              <Popup>
                <div>
                  <h3>测风塔-最近风机距离</h3>
                  <p>
                    半径约为 {(nearestDistance / 1000).toFixed(2)} km
                  </p>
                </div>
              </Popup>
            </Circle>
          )}
          
          {/* 距离标注（可选） */}
          {showWindTowerLabel && labelPosition && (
            <Marker
              position={labelPosition}
              icon={L.divIcon({
                className: 'radius-label',
                html: `<div style="
                  background: rgba(155, 89, 182, 0.9);
                  color: white;
                  padding: 2px 8px;
                  border-radius: 10px;
                  font-size: 12px;
                  font-weight: bold;
                  white-space: nowrap;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                ">${(nearestDistance / 1000).toFixed(2)} km</div>`,
                iconSize: [80, 24],
                iconAnchor: [40, 12],
              })}
            />
          )}
          
          <Marker
            position={[windTowerCoord.lat, windTowerCoord.lng]}
            icon={createWindTowerIcon(
              windTowerStyle?.size || 30,
              windTowerStyle?.color || 'rgba(155, 89, 182, 0.8)'
            )}
          >
            <Popup>
              <div>
                <h3>🗼 测风塔</h3>
                <p>
                  <strong>坐标:</strong> {windTowerCoord.lat.toFixed(6)}°N, {windTowerCoord.lng.toFixed(6)}°E
                </p>
                <p>
                  <strong>最近风机距离:</strong>{' '}
                  {nearestDistance ? `${(nearestDistance / 1000).toFixed(2)} km` : '无机位点'}
                </p>
              </div>
            </Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}
