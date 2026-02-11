/**
 * UTM坐标转换为经纬度（WGS84）
 * 
 * UTM (Universal Transverse Mercator) 坐标系统参数：
 * - zone: 度带 (1-60)
 * - hemisphere: 半球 ('N' 北半球, 'S' 南半球)
 * - easting: X坐标（东向坐标），单位：米
 * - northing: Y坐标（北向坐标），单位：米
 */

// WGS84椭球体参数
const a = 6378137.0; // 长半轴（米）
const f = 1 / 298.257223563; // 扁率
const b = a * (1 - f); // 短半轴
const e = Math.sqrt((a * a - b * b) / (a * a)); // 第一偏心率
const e2 = e * e;
const e4 = e2 * e2;
const e6 = e4 * e2;
const ep2 = (a * a - b * b) / (b * b); // 第二偏心率的平方

// UTM参数
const k0 = 0.9996; // 比例因子
const E0 = 500000; // 假东偏移（米）

export interface UTMCoordinate {
  zone: number;       // 度带 (1-60)
  hemisphere: 'N' | 'S';  // 半球
  easting: number;    // X坐标（东向坐标），米
  northing: number;   // Y坐标（北向坐标），米
}

export interface LatLngCoordinate {
  lat: number;  // 纬度（度）
  lng: number;  // 经度（度）
}

/**
 * UTM坐标转换为经纬度
 */
export function utmToLatLng(utm: UTMCoordinate): LatLngCoordinate {
  const { zone, hemisphere, easting, northing } = utm;
  
  // 验证输入
  if (zone < 1 || zone > 60) {
    throw new Error('度带必须在1-60之间');
  }
  
  // 计算中央经线
  const lambda0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  
  // 调整坐标
  const x = easting - E0;
  let y = northing;
  
  // 南半球调整
  if (hemisphere === 'S') {
    y = y - 10000000;
  }
  
  // 计算底点纬度（footpoint latitude）
  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256));
  
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const e12 = e1 * e1;
  const e13 = e12 * e1;
  const e14 = e13 * e1;
  
  const phi1 = mu + 
    (3 * e1 / 2 - 27 * e13 / 32) * Math.sin(2 * mu) +
    (21 * e12 / 16 - 55 * e14 / 32) * Math.sin(4 * mu) +
    (151 * e13 / 96) * Math.sin(6 * mu) +
    (1097 * e14 / 512) * Math.sin(8 * mu);
  
  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);
  
  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = ep2 * cosPhi1 * cosPhi1;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * k0);
  
  const D2 = D * D;
  const D3 = D2 * D;
  const D4 = D3 * D;
  const D5 = D4 * D;
  const D6 = D5 * D;
  
  // 计算纬度
  const lat = phi1 - (N1 * tanPhi1 / R1) * (
    D2 / 2 -
    (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D4 / 24 +
    (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D6 / 720
  );
  
  // 计算经度
  const lng = lambda0 + (
    D -
    (1 + 2 * T1 + C1) * D3 / 6 +
    (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D5 / 120
  ) / cosPhi1;
  
  // 转换为度
  return {
    lat: lat * 180 / Math.PI,
    lng: lng * 180 / Math.PI
  };
}

/**
 * 经纬度转换为UTM坐标
 */
export function latLngToUtm(latLng: LatLngCoordinate): UTMCoordinate {
  const { lat, lng } = latLng;
  
  // 计算度带
  const zone = Math.floor((lng + 180) / 6) + 1;
  
  // 中央经线
  const lambda0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  
  const phi = lat * Math.PI / 180;
  const lambda = lng * Math.PI / 180;
  
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);
  
  const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = ep2 * cosPhi * cosPhi;
  const A = cosPhi * (lambda - lambda0);
  const M = a * (
    (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi -
    (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi) +
    (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi) -
    (35 * e6 / 3072) * Math.sin(6 * phi)
  );
  
  const A2 = A * A;
  const A3 = A2 * A;
  const A4 = A3 * A;
  const A5 = A4 * A;
  const A6 = A5 * A;
  
  const easting = E0 + k0 * N * (
    A +
    (1 - T + C) * A3 / 6 +
    (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A5 / 120
  );
  
  let northing = k0 * (
    M + N * tanPhi * (
      A2 / 2 +
      (5 - T + 9 * C + 4 * C * C) * A4 / 24 +
      (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A6 / 720
    )
  );
  
  // 南半球调整
  const hemisphere: 'N' | 'S' = lat >= 0 ? 'N' : 'S';
  if (hemisphere === 'S') {
    northing = northing + 10000000;
  }
  
  return {
    zone,
    hemisphere,
    easting,
    northing
  };
}

/**
 * 验证UTM坐标是否有效
 */
export function validateUTM(utm: Partial<UTMCoordinate>): string | null {
  if (utm.zone === undefined || utm.zone < 1 || utm.zone > 60) {
    return '度带必须在1-60之间';
  }
  
  if (utm.hemisphere !== 'N' && utm.hemisphere !== 'S') {
    return '请选择半球（北/南）';
  }
  
  if (utm.easting === undefined || isNaN(utm.easting)) {
    return '请输入有效的X坐标（东向坐标）';
  }
  
  if (utm.northing === undefined || isNaN(utm.northing)) {
    return '请输入有效的Y坐标（北向坐标）';
  }
  
  // 一般UTM easting范围：100,000 - 900,000
  if (utm.easting < 100000 || utm.easting > 900000) {
    return 'X坐标（东向坐标）通常在100,000-900,000之间';
  }
  
  // UTM northing范围：0 - 10,000,000
  if (utm.northing < 0 || utm.northing > 10000000) {
    return 'Y坐标（北向坐标）必须在0-10,000,000之间';
  }
  
  return null;
}
