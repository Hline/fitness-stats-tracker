import { WorkoutRoute, GpsPoint, BoundingBox } from '../types/route';

/**
 * GPS 좌표 배열의 최소/최대 위경도(Bounding Box) 계산
 */
export function calculateBoundingBox(routes: WorkoutRoute[]): BoundingBox {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  let hasPoints = false;
  routes.forEach(route => {
    route.points.forEach(pt => {
      hasPoints = true;
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lng < minLng) minLng = pt.lng;
      if (pt.lng > maxLng) maxLng = pt.lng;
    });
  });

  if (!hasPoints) {
    // 서울 중심 기본값
    return { minLat: 37.50, maxLat: 37.55, minLng: 126.98, maxLng: 127.05 };
  }

  // 여백 5% 추가
  const latMargin = Math.max(0.005, (maxLat - minLat) * 0.08);
  const lngMargin = Math.max(0.005, (maxLng - minLng) * 0.08);

  return {
    minLat: minLat - latMargin,
    maxLat: maxLat + latMargin,
    minLng: minLng - lngMargin,
    maxLng: maxLng + lngMargin
  };
}

/**
 * GPS 포인트 단순화 (Douglas-Peucker 알고리즘 기반)
 * 대용량 장기 코스 렌더링 부하를 대폭 줄여줌
 */
export function simplifyGpsPoints(points: GpsPoint[], tolerance = 0.00008): GpsPoint[] {
  if (points.length <= 2) return points;

  // 양 끝점을 잇는 직선과 각 점 사이의 수직거리 계산
  const first = points[0];
  const last = points[points.length - 1];

  let maxDist = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    // 간단한 근사 수직거리
    const dist = Math.abs(
      (last.lng - first.lng) * (first.lat - pt.lat) - (first.lng - pt.lng) * (last.lat - first.lat)
    ) / Math.sqrt(Math.pow(last.lng - first.lng, 2) + Math.pow(last.lat - first.lat, 2) || 1);

    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyGpsPoints(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyGpsPoints(points.slice(maxIndex), tolerance);
    return left.slice(0, left.length - 1).concat(right);
  }

  return [first, last];
}

/**
 * 위경도 좌표를 주어진 Canvas/SVG 뷰포트(width, height) 상의 픽셀 (x, y)로 투영
 */
export function projectLatLng(
  lat: number,
  lng: number,
  box: BoundingBox,
  width: number,
  height: number
): { x: number; y: number } {
  const x = ((lng - box.minLng) / (box.maxLng - box.minLng || 1)) * width;
  // 위도는 북쪽(위)이 크므로 y축 반전
  const y = height - ((lat - box.minLat) / (box.maxLat - box.minLat || 1)) * height;
  return { x, y };
}

/**
 * [사용자 요구사항] 부하 이슈 해결 비동기 청크 백그라운드 처리기
 * - 1일치(단일 세션): 메인 스레드에서 즉시(0.01초) 연산
 * - 긴 기간(주간, 월간, 전체): 백그라운드 청크 스케줄러로 UI 프리징 없이 프로그레스와 함께 렌더링
 */
export async function processRoutesAsync(
  routes: WorkoutRoute[],
  isInstant: boolean,
  onProgress?: (processedCount: number, total: number) => void
): Promise<{
  processedRoutes: WorkoutRoute[];
  boundingBox: BoundingBox;
  totalDistanceKm: number;
  totalMinutes: number;
}> {
  const total = routes.length;

  // 1) 1일치(하루) 즉시 처리 모드
  if (isInstant || total <= 1) {
    if (onProgress) onProgress(total, total);
    const processed = routes.map(r => ({
      ...r,
      points: simplifyGpsPoints(r.points, 0.00004)
    }));
    return {
      processedRoutes: processed,
      boundingBox: calculateBoundingBox(processed),
      totalDistanceKm: processed.reduce((sum, r) => sum + r.distanceKm, 0),
      totalMinutes: processed.reduce((sum, r) => sum + r.durationMinutes, 0)
    };
  }

  // 2) 긴 기간 비동기 청크 백단 처리 모드 (청크당 2개씩 비동기 루프로 UI 프리징 방지)
  const chunkSize = 2;
  const processedRoutes: WorkoutRoute[] = [];

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = routes.slice(i, i + chunkSize);
    
    // 비동기 청크 연산 (브라우저 이벤트 루프에 제어권 반환)
    await new Promise(resolve => setTimeout(resolve, 25));

    chunk.forEach(r => {
      processedRoutes.push({
        ...r,
        // 장기 모드는 약간 더 강한 다운샘플링으로 렌더링 최적화
        points: simplifyGpsPoints(r.points, 0.00007)
      });
    });

    if (onProgress) {
      onProgress(Math.min(total, i + chunkSize), total);
    }
  }

  return {
    processedRoutes,
    boundingBox: calculateBoundingBox(processedRoutes),
    totalDistanceKm: processedRoutes.reduce((sum, r) => sum + r.distanceKm, 0),
    totalMinutes: processedRoutes.reduce((sum, r) => sum + r.durationMinutes, 0)
  };
}

/**
 * GPX XML 파일 텍스트 파싱 함수
 */
export function parseGpxXml(gpxText: string, name = 'GPX 운동 경로'): WorkoutRoute | null {
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"(?:\s*\/?>|>([\s\S]*?)<\/trkpt>)/g;
  const points: GpsPoint[] = [];

  let match: RegExpExecArray | null;
  while ((match = trkptRegex.exec(gpxText)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const inner = match[3] || '';

    let ele: number | undefined;
    const eleMatch = inner.match(/<ele>([^<]+)<\/ele>/);
    if (eleMatch) ele = parseFloat(eleMatch[1]);

    let time: string | undefined;
    const timeMatch = inner.match(/<time>([^<]+)<\/time>/);
    if (timeMatch) time = timeMatch[1];

    if (!isNaN(lat) && !isNaN(lng)) {
      points.push({ lat, lng, alt: ele, time });
    }
  }

  if (points.length < 2) return null;

  // 거리 계산 (Haversine 공식)
  let distKm = 0;
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    distKm += calculateHaversine(p1.lat, p1.lng, p2.lat, p2.lng);
  }

  return {
    id: `gpx-${Date.now()}`,
    date: new Date().toISOString().substring(0, 10),
    name,
    type: 'running',
    distanceKm: parseFloat(distKm.toFixed(2)),
    durationMinutes: Math.round(distKm * 5.5),
    points,
    color: '#10b981'
  };
}

function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
