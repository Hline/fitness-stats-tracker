import { WorkoutType } from './health';

export interface GpsPoint {
  lat: number;
  lng: number;
  alt?: number;
  time?: string;
  speed?: number; // km/h
  hr?: number;    // 심박수
}

export interface WorkoutRoute {
  id: string;
  workoutId?: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: WorkoutType;
  distanceKm: number;
  durationMinutes: number;
  points: GpsPoint[];
  avgPace?: string;
  color?: string; // 경로 강조 색상
  intensityScore?: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export type HeatmapPeriod = 'today' | 'week' | 'month' | 'all';
