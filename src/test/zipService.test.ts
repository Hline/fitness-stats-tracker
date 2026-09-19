import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseAppleHealthZip } from '../services/zipService';

describe('zipService (Apple Health export.zip 브라우저 내 직접 압축 해제 및 파싱)', () => {
  it('export.zip 내부의 apple_health_export/export.xml을 찾아 정상 파싱해야 한다', async () => {
    const zip = new JSZip();
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
    <HealthData>
      <Record type="HKQuantityTypeIdentifierStepCount" value="8420" startDate="2026-09-18 14:00:00 +0900" endDate="2026-09-18 15:00:00 +0900" />
      <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="40" totalEnergyBurned="380" startDate="2026-09-18 07:00:00 +0900" endDate="2026-09-18 07:40:00 +0900">
        <MetadataEntry key="HKMaximumHeartRate" value="172" />
        <MetadataEntry key="HKAverageHeartRate" value="155" />
      </Workout>
    </HealthData>`;

    zip.file('apple_health_export/export.xml', sampleXml);
    const content = await zip.generateAsync({ type: 'arraybuffer' });

    let lastProgress = 0;
    const result = await parseAppleHealthZip(content, (p) => {
      lastProgress = p;
    });

    expect(lastProgress).toBe(100);
    expect(result.stats).toBeDefined();
    expect(result.stats['2026-09-18']).toBeDefined();
    expect(result.stats['2026-09-18'].totalSteps).toBe(8420);
    expect(result.stats['2026-09-18'].workoutCount).toBe(1);
    expect(result.stats['2026-09-18'].peakHeartRate).toBe(172);
  });

  it('루트에 export.xml이 위치한 zip 파일도 정상 파싱해야 한다', async () => {
    const zip = new JSZip();
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
    <HealthData>
      <Record type="HKQuantityTypeIdentifierStepCount" value="5000" startDate="2026-09-19 10:00:00 +0900" endDate="2026-09-19 11:00:00 +0900" />
    </HealthData>`;

    zip.file('export.xml', sampleXml);
    const content = await zip.generateAsync({ type: 'arraybuffer' });

    const result = await parseAppleHealthZip(content);
    expect(result.stats['2026-09-19']).toBeDefined();
    expect(result.stats['2026-09-19'].totalSteps).toBe(5000);
  });

  it('export.xml이 없는 zip 파일은 친절한 에러 메시지를 발생시켜야 한다', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'This is an invalid zip without export.xml.');
    const content = await zip.generateAsync({ type: 'arraybuffer' });

    await expect(parseAppleHealthZip(content)).rejects.toThrow('export.xml을 찾을 수 없습니다');
  });
});
