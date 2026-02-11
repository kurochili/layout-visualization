import React from 'react';
import './Legend.css';

interface LegendProps {
  viewMode: 'overview' | 'detail';
  markerColors?: {
    current: string;
    future: string;
    modified: string;
  };
}

export default function Legend({ viewMode, markerColors }: LegendProps) {
  return (
    <div className="legend-container">
      <h3>图例</h3>
      <div className="legend-items">
        {viewMode === 'detail' ? (
          <>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: markerColors?.current ?? '#28a745' }}></div>
              <span>现有机位点</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: markerColors?.future ?? '#007bff' }}></div>
              <span>未来机位点</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: markerColors?.modified ?? '#ffc107' }}></div>
              <span>修改的机位点</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#e74c3c', opacity: 0.5 }}></div>
              <span>边界区域</span>
            </div>
            <div className="legend-item">
              <div className="legend-color wind-tower">
                <span style={{ fontSize: '14px' }}>🗼</span>
              </div>
              <span>测风塔</span>
            </div>
            <div className="legend-item">
              <div className="legend-circle" style={{ 
                border: '2px dashed #9b59b6',
                backgroundColor: 'rgba(155, 89, 182, 0.15)'
              }}></div>
              <span>测风塔-最近风机距离圆</span>
            </div>
          </>
        ) : (
          <>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#3498db' }}></div>
              <span>机位点</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f39c12', opacity: 0.5 }}></div>
              <span>边界区域</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#e74c3c' }}></div>
              <span>省会城市</span>
            </div>
            <div className="legend-item">
              <div className="legend-star">⭐</div>
              <span>首都</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
