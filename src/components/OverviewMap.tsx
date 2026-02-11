import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AircraftPosition, BoundaryData } from '../utils/kmlParser';

interface OverviewMapProps {
  positions: AircraftPosition[];
  boundaries: BoundaryData[];
}

// 中国主要省会城市数据
const provincialCapitals = [
  { name: '北京', lat: 39.9042, lng: 116.4074, isCapital: true },
  { name: '上海', lat: 31.2304, lng: 121.4737 },
  { name: '天津', lat: 39.0842, lng: 117.2009 },
  { name: '重庆', lat: 29.4316, lng: 106.9123 },
  { name: '石家庄', lat: 38.0428, lng: 114.5149 },
  { name: '太原', lat: 37.8706, lng: 112.5489 },
  { name: '呼和浩特', lat: 40.8427, lng: 111.7500 },
  { name: '沈阳', lat: 41.8057, lng: 123.4315 },
  { name: '长春', lat: 43.8171, lng: 125.3235 },
  { name: '哈尔滨', lat: 45.8038, lng: 126.5340 },
  { name: '南京', lat: 32.0603, lng: 118.7969 },
  { name: '杭州', lat: 30.2741, lng: 120.1551 },
  { name: '合肥', lat: 31.8206, lng: 117.2272 },
  { name: '福州', lat: 26.0745, lng: 119.2965 },
  { name: '南昌', lat: 28.6820, lng: 115.8579 },
  { name: '济南', lat: 36.6512, lng: 116.9972 },
  { name: '郑州', lat: 34.7466, lng: 113.6254 },
  { name: '武汉', lat: 30.5928, lng: 114.3055 },
  { name: '长沙', lat: 28.2282, lng: 112.9388 },
  { name: '广州', lat: 23.1291, lng: 113.2644 },
  { name: '南宁', lat: 22.8170, lng: 108.3665 },
  { name: '海口', lat: 20.0440, lng: 110.1999 },
  { name: '成都', lat: 30.5728, lng: 104.0668 },
  { name: '贵阳', lat: 26.6470, lng: 106.6302 },
  { name: '昆明', lat: 24.8801, lng: 102.8329 },
  { name: '拉萨', lat: 29.6500, lng: 91.1000 },
  { name: '西安', lat: 34.3416, lng: 108.9398 },
  { name: '兰州', lat: 36.0611, lng: 103.8343 },
  { name: '西宁', lat: 36.6171, lng: 101.7782 },
  { name: '银川', lat: 38.4872, lng: 106.2309 },
  { name: '乌鲁木齐', lat: 43.8256, lng: 87.6168 },
  { name: '台北', lat: 25.0330, lng: 121.5654 },
  { name: '香港', lat: 22.3193, lng: 114.1694 },
  { name: '澳门', lat: 22.1987, lng: 113.5439 },
];

// 创建省会城市红点图标
const createCapitalIcon = (isCapital: boolean) => {
  if (isCapital) {
    // 首都使用五角星
    return L.divIcon({
      className: 'capital-marker',
      html: `<div style="
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
      ">⭐</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }
  // 省会使用红点
  return L.divIcon({
    className: 'provincial-capital-marker',
    html: `<div style="
      width: 10px;
      height: 10px;
      background-color: #e74c3c;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
};

// 创建机位点图标
const createPositionIcon = () => {
  return L.divIcon({
    className: 'position-marker-overview',
    html: `<div style="
      width: 8px;
      height: 8px;
      background-color: #3498db;
      border: 1px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
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
      // 扩展边界以显示更多上下文
      map.fitBounds(bounds.pad(0.5), { padding: [50, 50] });
    }
  }, [positions, boundaries, map]);
  
  return null;
}

export default function OverviewMap({ positions, boundaries }: OverviewMapProps) {
  // 默认中心点（中国中部）
  const defaultCenter: [number, number] = [35.0, 105.0];
  const defaultZoom = 4;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%' }}
    >
      {/* 使用OpenStreetMap标准图层 */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={18}
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
                color: '#e67e22',
                weight: 2,
                fillColor: '#f39c12',
                fillOpacity: 0.2,
              }}
            >
              <Popup>
                <div>
                  <h3>{boundary.name}</h3>
                  <p><strong>类型:</strong> 边界区域</p>
                  {boundary.description && <p>{boundary.description}</p>}
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
                color: '#e67e22',
                weight: 2,
              }}
            >
              <Popup>
                <div>
                  <h3>{boundary.name}</h3>
                  <p><strong>类型:</strong> 边界线</p>
                  {boundary.description && <p>{boundary.description}</p>}
                </div>
              </Popup>
            </Polyline>
          );
        }
      })}
      
      {/* 显示所有机位点（小图标） */}
      {positions.map((position) => (
        <Marker
          key={position.id}
          position={[position.position.lat, position.position.lng]}
          icon={createPositionIcon()}
        >
          <Popup>
            <div>
              <h3>{position.name}</h3>
              <p>
                <strong>坐标:</strong> {position.position.lat.toFixed(6)}, {position.position.lng.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* 显示省会城市 */}
      {provincialCapitals.map((city) => (
        <Marker
          key={city.name}
          position={[city.lat, city.lng]}
          icon={createCapitalIcon(city.isCapital || false)}
        >
          <Popup>
            <div>
              <h3>{city.name}</h3>
              <p>{city.isCapital ? '首都' : '省会城市'}</p>
              <p>
                <strong>坐标:</strong> {city.lat.toFixed(4)}, {city.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
