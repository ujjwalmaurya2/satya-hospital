import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://')
);

let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    supabaseInstance = null;
  }
}

export const supabase = supabaseInstance;

export interface SupabaseHealthStatus {
  configured: boolean;
  reachable: boolean;
  url: string;
  tablesDetected: string[];
  tablesMissing: string[];
  errorMessage?: string;
  lastChecked: string;
}

export function getSupabaseStatus(): {
  configured: boolean;
  url: string;
  missingVariables: string[];
} {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  return {
    configured: isSupabaseConfigured,
    url: isSupabaseConfigured ? supabaseUrl : 'Not configured (Local Demonstration Mode Active)',
    missingVariables: missing,
  };
}

/**
 * Actively checks Supabase connectivity and reports which core tables are present in the schema.
 * Will not throw or break the application if network or tables are not yet migrated.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const now = new Date().toISOString();
  
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      reachable: false,
      url: 'Not configured',
      tablesDetected: [],
      tablesMissing: [
        'hospital_settings',
        'profiles',
        'patient_profiles',
        'departments',
        'services',
        'doctor_profiles',
        'appointments',
        'pathology_tests',
        'pathology_reports',
        'testimonials',
        'gallery_items'
      ],
      errorMessage: 'Supabase credentials missing or invalid in environment.',
      lastChecked: now,
    };
  }

  const expectedTables = [
    'hospital_settings',
    'profiles',
    'patient_profiles',
    'departments',
    'services',
    'doctor_profiles',
    'appointments',
    'pathology_tests',
    'pathology_reports',
    'testimonials',
    'gallery_items'
  ];

  const detected: string[] = [];
  const missing: string[] = [];

  try {
    const probePromise = supabase
      .from('hospital_settings')
      .select('id')
      .limit(1);

    const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) => 
      setTimeout(() => reject(new Error('Connection timed out')), 2500)
    );

    const { error: probeError } = await Promise.race([probePromise, timeoutPromise]);

    if (probeError) {
      if (probeError.code === 'PGRST205' || probeError.message?.includes('schema cache')) {
        return {
          configured: true,
          reachable: true,
          url: supabaseUrl,
          tablesDetected: [],
          tablesMissing: expectedTables,
          errorMessage: 'Connected to Supabase project, but core tables have not been created yet. Please execute the migration SQL in your Supabase SQL Editor.',
          lastChecked: now,
        };
      }
      return {
        configured: true,
        reachable: false,
        url: supabaseUrl,
        tablesDetected: [],
        tablesMissing: expectedTables,
        errorMessage: probeError.message || 'Error communicating with Supabase REST API.',
        lastChecked: now,
      };
    }

    detected.push('hospital_settings');

    // Probe remaining tables safely
    await Promise.all(
      expectedTables.filter(t => t !== 'hospital_settings').map(async (table) => {
        try {
          const { error } = await supabase!.from(table).select('id').limit(1);
          if (!error) {
            detected.push(table);
          } else {
            missing.push(table);
          }
        } catch {
          missing.push(table);
        }
      })
    );

    return {
      configured: true,
      reachable: true,
      url: supabaseUrl,
      tablesDetected: detected,
      tablesMissing: missing,
      lastChecked: now,
    };
  } catch (err: any) {
    return {
      configured: true,
      reachable: false,
      url: supabaseUrl,
      tablesDetected: [],
      tablesMissing: expectedTables,
      errorMessage: err?.message || 'Network error connecting to Supabase instance.',
      lastChecked: now,
    };
  }
}
