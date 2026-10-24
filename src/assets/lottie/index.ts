/**
 * Satya Hospital & Pathology — Curated Healthcare Lottie Animation Assets
 * 
 * Lightweight, accessible, vector-based Bodymovin JSON animations tailored to
 * the hospital's approved medical teal (#168C8C), sky blue (#3DA9DF),
 * mint green (#91BB40), and warm white (#FCFDFB) palette.
 */

import appointmentCalendarData from './appointmentCalendar.json';
import pediatricHeroPulseData from './pediatricHeroPulse.json';
import bookingSuccessCheckData from './bookingSuccessCheck.json';
import medicalSpinnerData from './medicalSpinner.json';
import medicalEmptyStateData from './medicalEmptyState.json';
import servicePediatricsData from './servicePediatrics.json';
import servicePathologyData from './servicePathology.json';
import serviceMedicineData from './serviceMedicine.json';

export const LottieAssets = {
  appointmentCalendar: appointmentCalendarData,
  pediatricHeroPulse: pediatricHeroPulseData,
  bookingSuccessCheck: bookingSuccessCheckData,
  medicalSpinner: medicalSpinnerData,
  medicalEmptyState: medicalEmptyStateData,
  servicePediatrics: servicePediatricsData,
  servicePathology: servicePathologyData,
  serviceMedicine: serviceMedicineData,
} as const;

export type LottieAssetName = keyof typeof LottieAssets;
