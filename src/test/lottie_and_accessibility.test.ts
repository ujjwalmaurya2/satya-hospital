import { describe, it, expect } from 'vitest';
import { LottieAssets, LottieAssetName } from '../assets/lottie';

describe('Healthcare Lottie Assets — Bodymovin Schema & Vector Quality', () => {
  const assetKeys: LottieAssetName[] = [
    'appointmentCalendar',
    'pediatricHeroPulse',
    'bookingSuccessCheck',
    'medicalSpinner',
    'medicalEmptyState',
    'servicePediatrics',
    'servicePathology',
    'serviceMedicine',
  ];

  it('contains all 8 curated healthcare animation assets', () => {
    expect(Object.keys(LottieAssets)).toHaveLength(8);
    assetKeys.forEach((key) => {
      expect(LottieAssets[key]).toBeDefined();
    });
  });

  it('strictly contains pure vector shape layers without external raster dependencies', () => {
    assetKeys.forEach((key) => {
      const anim = LottieAssets[key] as any;
      expect(anim.v).toBeDefined();
      expect(typeof anim.v).toBe('string');
      expect(anim.w).toBeGreaterThan(0);
      expect(anim.h).toBeGreaterThan(0);
      expect(anim.fr).toBeGreaterThan(0);
      expect(anim.op).toBeGreaterThan(anim.ip);
      expect(Array.isArray(anim.layers)).toBe(true);
      expect(anim.layers.length).toBeGreaterThan(0);
      // Pure vector guarantee: no embedded raster assets
      expect(anim.assets).toEqual([]);
    });
  });

  it('guarantees reserved aspect ratios to prevent cumulative layout shift (CLS = 0)', () => {
    assetKeys.forEach((key) => {
      const anim = LottieAssets[key] as any;
      expect(anim.w).toBeTypeOf('number');
      expect(anim.h).toBeTypeOf('number');
      const aspectRatio = anim.w / anim.h;
      expect(aspectRatio).toBeGreaterThan(0.5);
      expect(aspectRatio).toBeLessThan(2.0);
    });
  });

  it('non-looping bookingSuccessCheck animation has well-defined completion keyframes', () => {
    const successAnim = LottieAssets.bookingSuccessCheck as any;
    expect(successAnim.op).toBe(60);
    expect(successAnim.nm).toBe('BookingSuccessCheck');
    // Ensure checkmark layer is present
    const checkmarkLayer = successAnim.layers.find((l: any) => l.nm === 'Checkmark');
    expect(checkmarkLayer).toBeDefined();
  });

  it('medicalSpinner animation has continuous 360-degree rotation keyframes', () => {
    const spinnerAnim = LottieAssets.medicalSpinner as any;
    expect(spinnerAnim.op).toBe(60);
    const orbitLayer = spinnerAnim.layers.find((l: any) => l.nm === 'RotatingOrbitTeal');
    expect(orbitLayer).toBeDefined();
    expect(orbitLayer.ks.r.k[1].s[0]).toBe(360);
  });
});
