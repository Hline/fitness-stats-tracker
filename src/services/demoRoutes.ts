import { WorkoutRoute, GpsPoint } from '../types/route';

// 서울 중심 좌표
const SEOUL_BASE = { lat: 37.5185, lng: 127.0250 }; // 한강 반포/잠원 인근

// 지터(난수) 기반 부드러운 GPS 경로 생성 헬퍼
function generateSmoothedRoute(
  startLat: number,
  startLng: number,
  waypoints: { dLat: number; dLng: number }[],
  stepsPerSegment = 15
): GpsPoint[] {
  const points: GpsPoint[] = [];
  let curLat = startLat;
  let curLng = startLng;

  points.push({ lat: curLat, lng: curLng });

  waypoints.forEach((wp) => {
    const targetLat = curLat + wp.dLat;
    const targetLng = curLng + wp.dLng;

    for (let i = 1; i <= stepsPerSegment; i++) {
      const t = i / stepsPerSegment;
      // 약간의 GPS 흔들림 노이즈 추가
      const noiseLat = (Math.sin(i * 1.7) * 0.0001);
      const noiseLng = (Math.cos(i * 1.5) * 0.0001);
      
      const lat = curLat + (targetLat - curLat) * t + noiseLat;
      const lng = curLng + (targetLng - curLng) * t + noiseLng;

      points.push({
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        speed: 9.5 + Math.sin(i) * 2,
        hr: 150 + Math.floor(Math.sin(i) * 20)
      });
    }

    curLat = targetLat;
    curLng = targetLng;
  });

  return points;
}

/**
 * 현실적인 서울 대표 러닝 & 사이클 GPS 코스 10선 (자주 겹치는 중복 코스 포함)
 */
export function generateDemoRoutes(): WorkoutRoute[] {
  return [
    // 1. [오늘 러닝] 한강 반포 ~ 잠원 야외 러닝 (5.2km)
    {
      id: 'route-today-1',
      date: '2026-09-13',
      name: '한강 반포-잠원 수변 러닝 (오늘 오전)',
      type: 'running',
      distanceKm: 5.2,
      durationMinutes: 28,
      avgPace: "5'23\"",
      color: '#10b981', // 에메랄드
      points: generateSmoothedRoute(37.5115, 126.9950, [
        { dLat: 0.008, dLng: 0.015 },
        { dLat: 0.005, dLng: 0.020 },
        { dLat: -0.004, dLng: 0.018 },
        { dLat: -0.009, dLng: -0.053 } // 반환
      ])
    },
    // 2. [어제 저녁 러닝] 한강 잠원 ~ 뚝섬 방향 코스 (겹치는 한강변 코스!)
    {
      id: 'route-260912',
      date: '2026-09-12',
      name: '잠원-동호대교 템포런',
      type: 'running',
      distanceKm: 6.8,
      durationMinutes: 36,
      avgPace: "5'17\"",
      color: '#06b6d4', // 시안
      points: generateSmoothedRoute(37.5195, 127.0100, [
        { dLat: 0.005, dLng: 0.020 },
        { dLat: 0.007, dLng: 0.015 },
        { dLat: -0.003, dLng: 0.018 },
        { dLat: -0.009, dLng: -0.053 }
      ])
    },
    // 3. [3일 전 러닝] 한강 반포 ~ 동작대교 코스 (한강 메인 루트 겹침!)
    {
      id: 'route-260910',
      date: '2026-09-10',
      name: '반포 달빛광장 야간 인터벌',
      type: 'running',
      distanceKm: 7.5,
      durationMinutes: 40,
      avgPace: "5'20\"",
      color: '#f97316', // 오렌지
      points: generateSmoothedRoute(37.5115, 126.9950, [
        { dLat: -0.005, dLng: -0.022 },
        { dLat: 0.003, dLng: -0.018 },
        { dLat: 0.002, dLng: 0.040 }
      ])
    },
    // 4. [주간 사이클] 한강 잠실 ~ 여의도 장거리 라이딩 (22.0km)
    {
      id: 'route-260908',
      date: '2026-09-08',
      name: '한강 남단 메인 사이클링 (반포-여의도)',
      type: 'cycling',
      distanceKm: 22.0,
      durationMinutes: 52,
      avgPace: "25.3 km/h",
      color: '#a855f7', // 퍼플
      points: generateSmoothedRoute(37.5115, 126.9950, [
        { dLat: 0.008, dLng: 0.035 },
        { dLat: -0.006, dLng: -0.070 },
        { dLat: 0.012, dLng: -0.040 },
        { dLat: -0.014, dLng: 0.075 }
      ])
    },
    // 5. [남산 러닝] 남산 북측순환로 힐클라임 코스 (8.2km)
    {
      id: 'route-260905',
      date: '2026-09-05',
      name: '남산 북측순환로 언덕 훈련',
      type: 'running',
      distanceKm: 8.2,
      durationMinutes: 46,
      avgPace: "5'36\"",
      color: '#f43f5e', // 로즈
      points: generateSmoothedRoute(37.5510, 126.9880, [
        { dLat: 0.006, dLng: 0.012 },
        { dLat: -0.004, dLng: 0.015 },
        { dLat: -0.008, dLng: -0.005 },
        { dLat: 0.006, dLng: -0.022 }
      ])
    },
    // 6. [양재천 러닝] 양재천 수변 메타세쿼이아길 (5.5km)
    {
      id: 'route-260903',
      date: '2026-09-03',
      name: '양재천 힐링 이지런',
      type: 'running',
      distanceKm: 5.5,
      durationMinutes: 31,
      avgPace: "5'38\"",
      color: '#10b981',
      points: generateSmoothedRoute(37.4830, 127.0420, [
        { dLat: 0.004, dLng: 0.025 },
        { dLat: 0.003, dLng: 0.020 },
        { dLat: -0.007, dLng: -0.045 }
      ])
    },
    // 7. [올림픽공원] 평화의문 호수 순환런 (6.0km)
    {
      id: 'route-260901',
      date: '2026-09-01',
      name: '올림픽공원 호수 둘레길 3회전',
      type: 'running',
      distanceKm: 6.0,
      durationMinutes: 32,
      avgPace: "5'20\"",
      color: '#06b6d4',
      points: generateSmoothedRoute(37.5180, 127.1210, [
        { dLat: 0.008, dLng: 0.008 },
        { dLat: 0.005, dLng: -0.008 },
        { dLat: -0.007, dLng: -0.006 },
        { dLat: -0.006, dLng: 0.006 }
      ])
    }
  ];
}
