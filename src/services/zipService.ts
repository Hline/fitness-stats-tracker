import JSZip from 'jszip';
import { parseAppleHealthXml } from './appleHealthParser';
import { DailyStats } from '../types/health';

export interface ZipParseResult {
  stats: Record<string, DailyStats>;
  routesFound: number;
  message: string;
}

/**
 * Apple Health export.zip 압축 해제 및 export.xml 자동 추출/파싱
 */
export async function parseAppleHealthZip(
  fileOrBuffer: File | Blob | ArrayBuffer,
  onProgress?: (percent: number, statusText: string) => void
): Promise<ZipParseResult> {
  onProgress?.(15, 'ZIP 압축 파일 여는 중...');
  const zip = await JSZip.loadAsync(fileOrBuffer);

  onProgress?.(35, '압축 파일 내 export.xml 검색 중...');
  
  // export.xml 파일 검색 (루트 또는 apple_health_export/ 하위)
  let xmlFile = zip.file(/(?:^|\/)export\.xml$/i)[0];

  if (!xmlFile) {
    // 혹시 다른 이름의 xml이 있을 수 있으니 *.xml 검색
    const allXmls = zip.file(/\.xml$/i);
    if (allXmls.length > 0) {
      xmlFile = allXmls[0];
    }
  }

  if (!xmlFile) {
    throw new Error('ZIP 파일 내에서 export.xml을 찾을 수 없습니다. 아이폰 [건강] 앱의 "건강 데이터 내보내기" ZIP 파일인지 확인해주세요.');
  }

  onProgress?.(60, 'export.xml 데이터 압축 해제 및 읽는 중...');
  const xmlText = await xmlFile.async('string');

  onProgress?.(85, '건강 지표 및 운동 기록 파싱 중...');
  const stats = parseAppleHealthXml(xmlText);

  // GPX 경로 파일 수 감지 (참고용)
  const gpxFiles = zip.file(/workout-routes\/.*\.gpx$/i);

  onProgress?.(100, '완료!');
  return {
    stats,
    routesFound: gpxFiles.length,
    message: `성공! 총 ${Object.keys(stats).length}일치 Apple Health 데이터${
      gpxFiles.length > 0 ? ` (GPS 경로 ${gpxFiles.length}개 포함)` : ''
    }가 정상적으로 반영되었습니다.`
  };
}
