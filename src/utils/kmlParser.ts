import JSZip from 'jszip';

export interface Position {
  lat: number;
  lng: number;
  alt?: number;
}

export interface AircraftPosition {
  id: string;
  name: string;
  position: Position;
  description?: string;
  status: 'current' | 'future' | 'modified';
  type?: string;
}

// 边界数据接口
export interface BoundaryData {
  id: string;
  name: string;
  coordinates: Position[];  // 多边形或线的坐标点数组
  type: 'polygon' | 'linestring';
  description?: string;
}

// 解析结果接口
export interface ParsedKMLData {
  positions: AircraftPosition[];
  boundaries: BoundaryData[];
}

/**
 * 解析KML文件
 */
export async function parseKML(file: File): Promise<AircraftPosition[]> {
  const text = await file.text();
  const parser = new DOMParser();
  const kmlDoc = parser.parseFromString(text, 'application/xml');
  
  return extractPositions(kmlDoc);
}

/**
 * 解析KML文件 - 完整数据（包含边界）
 */
export async function parseKMLFull(file: File): Promise<ParsedKMLData> {
  const text = await file.text();
  const parser = new DOMParser();
  const kmlDoc = parser.parseFromString(text, 'application/xml');
  
  return {
    positions: extractPositions(kmlDoc),
    boundaries: extractBoundaries(kmlDoc)
  };
}

/**
 * 解析KMZ文件（ZIP格式的KML）
 */
export async function parseKMZ(file: File): Promise<AircraftPosition[]> {
  const zip = await JSZip.loadAsync(file);
  const kmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.kml'));
  
  if (kmlFiles.length === 0) {
    throw new Error('KMZ文件中未找到KML文件');
  }
  
  const kmlContent = await zip.files[kmlFiles[0]].async('string');
  const parser = new DOMParser();
  const kmlDoc = parser.parseFromString(kmlContent, 'application/xml');
  
  return extractPositions(kmlDoc);
}

/**
 * 解析KMZ文件 - 完整数据（包含边界）
 */
export async function parseKMZFull(file: File): Promise<ParsedKMLData> {
  const zip = await JSZip.loadAsync(file);
  const kmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.kml'));
  
  if (kmlFiles.length === 0) {
    throw new Error('KMZ文件中未找到KML文件');
  }
  
  const kmlContent = await zip.files[kmlFiles[0]].async('string');
  const parser = new DOMParser();
  const kmlDoc = parser.parseFromString(kmlContent, 'application/xml');
  
  return {
    positions: extractPositions(kmlDoc),
    boundaries: extractBoundaries(kmlDoc)
  };
}

/**
 * 从KML文档中提取机位点
 */
function extractPositions(kmlDoc: Document): AircraftPosition[] {
  const positions: AircraftPosition[] = [];
  
  // 查找所有Placemark节点
  const placemarks = kmlDoc.getElementsByTagName('Placemark');
  
  for (let i = 0; i < placemarks.length; i++) {
    const placemark = placemarks[i];
    const name = getTextContent(placemark, 'name') || `机位点 ${i + 1}`;
    const description = getTextContent(placemark, 'description') || '';
    
    let coords: Position | null = null;
    
    // 优先检查Point节点中的坐标
    const point = placemark.getElementsByTagName('Point')[0];
    if (point) {
      const coordinates = getTextContent(point, 'coordinates');
      if (coordinates) {
        coords = parseCoordinates(coordinates);
      }
    }
    
    // 如果没有找到Point，但也没有Polygon或LineString，尝试解析coordinates
    if (!coords) {
      const polygon = placemark.getElementsByTagName('Polygon')[0];
      const lineString = placemark.getElementsByTagName('LineString')[0];
      
      // 如果不是边界类型，才尝试解析坐标为点
      if (!polygon && !lineString) {
      const coordinates = getTextContent(placemark, 'coordinates');
      if (coordinates) {
        coords = parseCoordinates(coordinates);
        }
      }
    }
    
    // 如果找到坐标，添加到列表
    if (coords) {
      const status = determineStatus(name, description);
      positions.push({
        id: `position-${i}`,
        name,
        position: coords,
        description,
        status,
        type: getTextContent(placemark, 'styleUrl') || undefined
      });
    }
  }
  
  return positions;
}

/**
 * 从KML文档中提取边界（Polygon和LineString）
 */
function extractBoundaries(kmlDoc: Document): BoundaryData[] {
  const boundaries: BoundaryData[] = [];
  
  // 查找所有Placemark节点
  const placemarks = kmlDoc.getElementsByTagName('Placemark');
  
  for (let i = 0; i < placemarks.length; i++) {
    const placemark = placemarks[i];
    const name = getTextContent(placemark, 'name') || `边界 ${i + 1}`;
    const description = getTextContent(placemark, 'description') || '';
    
    // 检查Polygon
    const polygon = placemark.getElementsByTagName('Polygon')[0];
    if (polygon) {
      // 获取外环坐标
      const outerBoundary = polygon.getElementsByTagName('outerBoundaryIs')[0];
      if (outerBoundary) {
        const linearRing = outerBoundary.getElementsByTagName('LinearRing')[0];
        if (linearRing) {
          const coordinates = getTextContent(linearRing, 'coordinates');
          if (coordinates) {
            const coords = parseMultipleCoordinates(coordinates);
            if (coords.length > 0) {
              boundaries.push({
                id: `boundary-polygon-${boundaries.length}`,
                name,
                coordinates: coords,
                type: 'polygon',
                description
              });
            }
          }
        }
      }
      continue;
    }
    
    // 检查LineString
    const lineString = placemark.getElementsByTagName('LineString')[0];
    if (lineString) {
      const coordinates = getTextContent(lineString, 'coordinates');
      if (coordinates) {
        const coords = parseMultipleCoordinates(coordinates);
        if (coords.length > 0) {
          boundaries.push({
            id: `boundary-line-${boundaries.length}`,
            name,
            coordinates: coords,
            type: 'linestring',
            description
          });
        }
      }
    }
  }
  
  return boundaries;
}

/**
 * 解析多个坐标点（用于Polygon和LineString）
 */
function parseMultipleCoordinates(coordString: string): Position[] {
  const positions: Position[] = [];
  
  // 坐标点之间用空格或换行分隔
  const coordPairs = coordString.trim().split(/\s+/);
  
  for (const pair of coordPairs) {
    if (pair.trim()) {
      const coord = parseCoordinates(pair);
      if (coord) {
        positions.push(coord);
      }
    }
  }
  
  return positions;
}

/**
 * 解析坐标字符串 "lng,lat,alt" 或 "lng,lat"
 */
function parseCoordinates(coordString: string): Position | null {
  const parts = coordString.trim().split(',');
  if (parts.length < 2) return null;
  
  const lng = parseFloat(parts[0]);
  const lat = parseFloat(parts[1]);
  const alt = parts.length > 2 ? parseFloat(parts[2]) : undefined;
  
  if (isNaN(lng) || isNaN(lat)) return null;
  
  return { lat, lng, alt };
}

/**
 * 获取XML节点的文本内容
 */
function getTextContent(parent: Element, tagName: string): string | null {
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length > 0 && elements[0].textContent) {
    return elements[0].textContent.trim();
  }
  return null;
}

/**
 * 根据名称和描述判断机位点状态
 * 可以根据实际需求调整判断逻辑
 */
function determineStatus(name: string, description: string): 'current' | 'future' | 'modified' {
  const lowerName = name.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  // 如果包含"未来"、"计划"、"新增"等关键词，标记为future
  if (lowerName.includes('未来') || lowerName.includes('计划') || 
      lowerName.includes('新增') || lowerDesc.includes('未来') ||
      lowerDesc.includes('计划') || lowerDesc.includes('新增')) {
    return 'future';
  }
  
  // 如果包含"修改"、"更新"等关键词，标记为modified
  if (lowerName.includes('修改') || lowerName.includes('更新') ||
      lowerDesc.includes('修改') || lowerDesc.includes('更新')) {
    return 'modified';
  }
  
  // 默认为现有机位点
  return 'current';
}

