import React, { useState, useRef } from 'react';
import MapView from './components/MapView';
import OverviewMap from './components/OverviewMap';
import Legend from './components/Legend';
import MiniMap from './components/MiniMap';
import { parseKMLFull, parseKMZFull, AircraftPosition, BoundaryData, ParsedKMLData } from './utils/kmlParser';
import { utmToLatLng, validateUTM, UTMCoordinate } from './utils/utmConverter';
import './App.css';

type ViewMode = 'overview' | 'detail';

function App() {
  const [positions, setPositions] = useState<AircraftPosition[]>([]);
  const [boundaries, setBoundaries] = useState<BoundaryData[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 机位点批量颜色（按状态）
  const [markerColors, setMarkerColors] = useState<{
    current: string;
    future: string;
    modified: string;
  }>({
    current: '#28a745',
    future: '#007bff',
    modified: '#ffc107',
  });

  // 单个机位点颜色覆盖（按 id）
  const [positionColors, setPositionColors] = useState<Record<string, string>>({});
  
  // 测风塔坐标（经纬度，用于地图显示）
  const [windTowerCoord, setWindTowerCoord] = useState<{ lat: number; lng: number } | null>(null);
  // 测风塔显示与样式控制
  const [showWindTowerCircle, setShowWindTowerCircle] = useState(true);
  const [showWindTowerLabel, setShowWindTowerLabel] = useState(true);
  const [windTowerStyle, setWindTowerStyle] = useState<{ size: number; color: string }>({
    size: 30,
    color: 'rgba(155, 89, 182, 0.8)',
  });
  
  // 测风塔UTM输入
  const [utmInput, setUtmInput] = useState({
    hemisphere: 'N' as 'N' | 'S',
    zone: '',
    easting: '',  // X坐标
    northing: ''  // Y坐标
  });
  
  // 风场中心位置（用于MiniMap）
  const [windFieldCenter, setWindFieldCenter] = useState<{ lat: number; lng: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boundaryFileInputRef = useRef<HTMLInputElement>(null);

  // 解析文件的通用函数
  const parseFile = async (file: File): Promise<ParsedKMLData> => {
    if (file.name.endsWith('.kml')) {
      return await parseKMLFull(file);
    } else if (file.name.endsWith('.kmz')) {
      return await parseKMZFull(file);
    } else {
      throw new Error('不支持的文件格式，请上传KML或KMZ文件');
    }
  };

  // 处理机位点文件上传
  const handleLayoutFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await parseFile(file);

      if (data.positions.length === 0 && data.boundaries.length === 0) {
        throw new Error('文件中未找到机位点或边界数据');
      }

      setPositions(data.positions);
      // 如果文件中包含边界，也添加进去
      if (data.boundaries.length > 0) {
        setBoundaries(prev => [...prev, ...data.boundaries]);
      }
      
      // 计算风场中心位置
      if (data.positions.length > 0) {
        const avgLat = data.positions.reduce((sum, p) => sum + p.position.lat, 0) / data.positions.length;
        const avgLng = data.positions.reduce((sum, p) => sum + p.position.lng, 0) / data.positions.length;
        setWindFieldCenter({ lat: avgLat, lng: avgLng });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析文件时出错');
      console.error('解析错误:', err);
    } finally {
      setLoading(false);
    }
  };

  // 处理边界文件上传
  const handleBoundaryFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await parseFile(file);

      if (data.boundaries.length === 0 && data.positions.length === 0) {
        throw new Error('文件中未找到边界数据');
      }

      // 添加边界数据
      setBoundaries(prev => [...prev, ...data.boundaries]);
      
      // 如果边界文件中也有点数据，也添加进去
      if (data.positions.length > 0) {
        setPositions(prev => [...prev, ...data.positions]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析边界文件时出错');
      console.error('解析边界错误:', err);
    } finally {
      setLoading(false);
    }
  };

  // 设置测风塔坐标（UTM转换）
  const handleSetWindTower = () => {
    const zone = parseInt(utmInput.zone);
    const easting = parseFloat(utmInput.easting);
    const northing = parseFloat(utmInput.northing);
    
    const utm: Partial<UTMCoordinate> = {
      hemisphere: utmInput.hemisphere,
      zone,
      easting,
      northing
    };
    
    // 验证UTM坐标
    const validationError = validateUTM(utm);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    try {
      // UTM转经纬度
      const latLng = utmToLatLng(utm as UTMCoordinate);
      setWindTowerCoord(latLng);
      setError(null);
      // 设置测风塔后，确保默认显示圆圈和标注
      setShowWindTowerCircle(true);
      setShowWindTowerLabel(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'UTM坐标转换失败');
    }
  };

  // 清除所有数据
  const handleClearAll = () => {
    setPositions([]);
    setBoundaries([]);
    setWindTowerCoord(null);
    setWindFieldCenter(null);
    setMarkerColors({
      current: '#28a745',
      future: '#007bff',
      modified: '#ffc107',
    });
    setPositionColors({});
    setShowWindTowerCircle(true);
    setShowWindTowerLabel(true);
    setWindTowerStyle({ size: 30, color: 'rgba(155, 89, 182, 0.8)' });
    setUtmInput({ hemisphere: 'N', zone: '', easting: '', northing: '' });
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (boundaryFileInputRef.current) boundaryFileInputRef.current.value = '';
  };

  const hasData = positions.length > 0 || boundaries.length > 0;

  // 批量修改颜色
  const handleUpdateMarkerColor = (status: AircraftPosition['status'], color: string) => {
    setMarkerColors((prev) => ({
      ...prev,
      [status]: color,
    }));
  };

  // 单个机位点颜色修改
  const handleUpdatePositionColor = (id: string, color: string) => {
    setPositionColors((prev) => ({
      ...prev,
      [id]: color,
    }));
  };

  // 重置单个机位点颜色为批量颜色
  const handleResetPositionColor = (id: string) => {
    setPositionColors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>机位图可视化系统</h1>
        <div className="header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".kml,.kmz"
            onChange={handleLayoutFileUpload}
            style={{ display: 'none' }}
          />
          <input
            ref={boundaryFileInputRef}
            type="file"
            accept=".kml,.kmz"
            onChange={handleBoundaryFileUpload}
            style={{ display: 'none' }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? '加载中...' : '📍 上传机位点文件'}
          </button>
          <button 
            onClick={() => boundaryFileInputRef.current?.click()}
            disabled={loading}
            className="btn btn-primary"
          >
            📐 上传边界文件
          </button>
          {hasData && (
            <>
              <div className="view-toggle">
                <button 
                  onClick={() => setViewMode('overview')}
                  className={`btn ${viewMode === 'overview' ? 'btn-active' : 'btn-secondary'}`}
                >
                  🗺️ 概览视图
                </button>
                <button 
                  onClick={() => setViewMode('detail')}
                  className={`btn ${viewMode === 'detail' ? 'btn-active' : 'btn-secondary'}`}
                >
                  🔍 详细视图
                </button>
              </div>
              <button 
                onClick={handleClearAll}
                className="btn btn-danger"
              >
                🗑️ 清除数据
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="map-container">
        {hasData ? (
          <>
            {viewMode === 'overview' ? (
              <OverviewMap 
                positions={positions} 
                boundaries={boundaries}
              />
            ) : (
              <MapView 
                positions={positions} 
                boundaries={boundaries}
                windTowerCoord={windTowerCoord}
                showWindTowerCircle={showWindTowerCircle}
                showWindTowerLabel={showWindTowerLabel}
                windTowerStyle={windTowerStyle}
                markerColors={markerColors}
                positionColors={positionColors}
                onUpdatePositionColor={handleUpdatePositionColor}
                onResetPositionColor={handleResetPositionColor}
              />
            )}
            <Legend viewMode={viewMode} markerColors={markerColors} />
            {viewMode === 'detail' && (
              <>
                <MiniMap 
                  positions={positions}
                  boundaries={boundaries}
                  windFieldCenter={windFieldCenter}
                />
                <div className="wind-tower-panel">
                  <h4>🗼 测风塔坐标 (UTM)</h4>
                  <div className="utm-inputs">
                    <div className="utm-row">
                      <div className="input-group">
                        <label>半球:</label>
                        <select 
                          value={utmInput.hemisphere}
                          onChange={(e) => setUtmInput(prev => ({ 
                            ...prev, 
                            hemisphere: e.target.value as 'N' | 'S' 
                          }))}
                          className="hemisphere-select"
                        >
                          <option value="N">北半球 (N)</option>
                          <option value="S">南半球 (S)</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label>度带:</label>
                        <input 
                          type="number" 
                          placeholder="1-60"
                          min="1"
                          max="60"
                          value={utmInput.zone}
                          onChange={(e) => setUtmInput(prev => ({ ...prev, zone: e.target.value }))}
                          className="zone-input"
                        />
                      </div>
                    </div>
                    <div className="utm-row">
                      <div className="input-group">
                        <label>X (东向):</label>
                        <input 
                          type="text" 
                          placeholder="例: 500000"
                          value={utmInput.easting}
                          onChange={(e) => setUtmInput(prev => ({ ...prev, easting: e.target.value }))}
                        />
                      </div>
                      <div className="input-group">
                        <label>Y (北向):</label>
                        <input 
                          type="text" 
                          placeholder="例: 4500000"
                          value={utmInput.northing}
                          onChange={(e) => setUtmInput(prev => ({ ...prev, northing: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="utm-actions">
                      <button 
                        onClick={handleSetWindTower}
                        className="btn btn-small btn-primary"
                      >
                        确定
                      </button>
                      {windTowerCoord && (
                        <button 
                          onClick={() => setWindTowerCoord(null)}
                          className="btn btn-small btn-secondary"
                        >
                          清除
                        </button>
                      )}
                    </div>
                  </div>
                  {windTowerCoord && (
                    <div className="current-tower-info">
                      <div>当前测风塔位置:</div>
                      <div className="coord-display">
                        {windTowerCoord.lat.toFixed(6)}°{windTowerCoord.lat >= 0 ? 'N' : 'S'}, 
                        {windTowerCoord.lng.toFixed(6)}°{windTowerCoord.lng >= 0 ? 'E' : 'W'}
                      </div>
                      <div className="tower-style-controls">
                        <div className="input-group">
                          <label>图标颜色:</label>
                          <input
                            type="color"
                            value={windTowerStyle.color.startsWith('rgba') ? '#9b59b6' : windTowerStyle.color}
                            onChange={(e) =>
                              setWindTowerStyle(prev => ({
                                ...prev,
                                color: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="input-group">
                          <label>图标大小:</label>
                          <input
                            type="range"
                            min={16}
                            max={60}
                            value={windTowerStyle.size}
                            onChange={(e) =>
                              setWindTowerStyle(prev => ({
                                ...prev,
                                size: Number(e.target.value),
                              }))
                            }
                          />
                          <span>{windTowerStyle.size}px</span>
                        </div>
                        <div className="input-group checkbox-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={showWindTowerCircle}
                              onChange={(e) => setShowWindTowerCircle(e.target.checked)}
                            />
                            显示测风塔-最近风机距离圆
                          </label>
                        </div>
                        <div className="input-group checkbox-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={showWindTowerLabel}
                              onChange={(e) => setShowWindTowerLabel(e.target.checked)}
                            />
                            显示距离标注
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="marker-color-panel">
                  <h4>🎨 机位点颜色设置</h4>
                  <div className="marker-color-row">
                    <div className="input-group">
                      <label>现有机位点颜色:</label>
                      <input
                        type="color"
                        value={markerColors.current}
                        onChange={(e) => handleUpdateMarkerColor('current', e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label>未来机位点颜色:</label>
                      <input
                        type="color"
                        value={markerColors.future}
                        onChange={(e) => handleUpdateMarkerColor('future', e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label>修改的机位点颜色:</label>
                      <input
                        type="color"
                        value={markerColors.modified}
                        onChange={(e) => handleUpdateMarkerColor('modified', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="marker-color-tip">
                    单个机位点可在地图上点击标记，在弹窗中单独修改颜色。
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-content">
              <h2>📁 请上传KML或KMZ文件</h2>
              <p>支持单个文件或分别上传机位点和边界文件</p>
              <div className="upload-buttons">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary btn-large"
                >
                  📍 选择机位点文件
                </button>
                <button 
                  onClick={() => boundaryFileInputRef.current?.click()}
                  className="btn btn-secondary btn-large"
                >
                  📐 选择边界文件
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasData && (
        <div className="info-panel">
          <span>机位点总数: {positions.length}</span>
          <span>边界数量: {boundaries.length}</span>
          <span>现有机位点: {positions.filter(p => p.status === 'current').length}</span>
          <span>未来机位点: {positions.filter(p => p.status === 'future').length}</span>
          <span>修改的机位点: {positions.filter(p => p.status === 'modified').length}</span>
          {windTowerCoord && <span>测风塔: ✓</span>}
        </div>
      )}
    </div>
  );
}

export default App;
