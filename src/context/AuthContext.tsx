import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole, PatientProfile } from '../types';
import { demoAccounts, initialPatientProfiles } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { auditLogger } from '../lib/audit';

interface AuthContextType {
  user: UserProfile | null;
  patientProfile: PatientProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True when the session comes from Supabase Auth (not a local demo login). */
  isLiveSession: boolean;
  signInWithEmail: (email: string, password: string) => Promise<UserProfile>;
  sendMagicLink: (email: string, redirectPath: string) => Promise<void>;
  /** Starts Google sign-in; returns to `redirectPath` (default: patient dashboard). */
  loginWithGoogle: (redirectPath?: string) => Promise<void>;
  loginAsDemoUser: (role: UserRole) => void;
  loginAsPatient: (patientId: string) => boolean;
  logout: () => Promise<void>;
  updateRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'satya_auth_user';
const AUTH_PATIENT_KEY = 'satya_auth_patient';

const STAFF_ROLES: UserRole[] = ['reception', 'doctor', 'pathology', 'admin'];

async function fetchLiveProfile(userId: string): Promise<{ user: UserProfile; patient: PatientProfile | null } | null> {
  if (!supabase) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!profile) return null;

  const userObj: UserProfile = {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    phone: profile.phone,
    isActive: profile.is_active,
    createdAt: profile.created_at,
  };

  let patient: PatientProfile | null = null;
  if (profile.role === 'patient') {
    // A parent's account can hold several family members; use the earliest record as the default.
    const { data: pat } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    patient = pat
      ? {
          id: pat.id,
          profileId: pat.profile_id,
          patientId: pat.patient_id,
          fullName: pat.full_name,
          dob: pat.dob ?? undefined,
          gender: pat.gender ?? undefined,
          phone: pat.phone,
          email: pat.email ?? undefined,
          bloodGroup: pat.blood_group ?? undefined,
          address: pat.address ?? undefined,
          emergencyContact: pat.emergency_contact ?? undefined,
          isVerified: pat.is_verified,
          createdAt: pat.created_at,
          updatedAt: pat.updated_at,
        }
      : null;
  }
  return { user: userObj, patient };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveSession, setIsLiveSession] = useState<boolean>(false);

  const applyLiveProfile = (live: { user: UserProfile; patient: PatientProfile | null }) => {
    setUser(live.user);
    setPatientProfile(live.patient);
    setIsLiveSession(true);
    // A live session supersedes any stored demo session.
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_PATIENT_KEY);
  };

  // Initialize session on mount
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);

      // Check live Supabase session if configured
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const live = await fetchLiveProfile(session.user.id);
            if (live && live.user.isActive) {
              applyLiveProfile(live);
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Error reading live Supabase session:', err);
        }
      }

      // Fallback: Check local storage for persistent demo/mock session
      try {
        const storedUser = localStorage.getItem(AUTH_USER_KEY);
        const storedPatient = localStorage.getItem(AUTH_PATIENT_KEY);
        if (storedUser) {
          const parsedUser: UserProfile = JSON.parse(storedUser);
          // Staff roles only ever come from Supabase Auth outside development:
          // a hand-edited localStorage entry must not open a staff workspace.
          if (!import.meta.env.DEV && STAFF_ROLES.includes(parsedUser.role)) {
            localStorage.removeItem(AUTH_USER_KEY);
            return;
          }
          setUser(parsedUser);
          if (storedPatient) {
            setPatientProfile(JSON.parse(storedPatient));
          }
        } else if (import.meta.env.DEV) {
          // Default to demo patient account for immediate local development exploration ONLY
          const defaultDemo = demoAccounts.find(a => a.role === 'patient') || demoAccounts[0];
          setUser(defaultDemo);
          const defaultPat = initialPatientProfiles.find(p => p.profileId === defaultDemo.id) || initialPatientProfiles[0];
          setPatientProfile(defaultPat);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(defaultDemo));
          localStorage.setItem(AUTH_PATIENT_KEY, JSON.stringify(defaultPat));
        }
      } catch (err) {
        console.error('Failed to load local auth session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    // Magic-link redirects land with a session in the URL; pick it up here.
    const sub = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userId = session.user.id;
        // Defer: supabase-js must not be awaited inside this callback.
        setTimeout(async () => {
          const live = await fetchLiveProfile(userId);
          if (live && live.user.isActive) applyLiveProfile(live);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setIsLiveSession(prev => {
          if (prev) {
            setUser(null);
            setPatientProfile(null);
          }
          return false;
        });
      }
    });

    return () => sub?.data.subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string): Promise<UserProfile> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Email sign-in needs Supabase to be configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      throw new Error(error?.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error?.message || 'Sign-in failed.');
    }

    const live = await fetchLiveProfile(data.user.id);
    if (!live) {
      await supabase.auth.signOut();
      throw new Error('This account has no staff profile yet. Ask the hospital administrator to provision it.');
    }
    if (!live.user.isActive) {
      await supabase.auth.signOut();
      throw new Error('This staff account has been deactivated.');
    }

    applyLiveProfile(live);
    auditLogger.record({
      actorId: live.user.id,
      actorName: live.user.fullName,
      actorRole: live.user.role,
      actionType: 'auth.login',
      targetEntity: 'profiles',
      targetId: live.user.id,
      description: 'Signed in with email and password.',
    });
    return live.user;
  };

  const sendMagicLink = async (email: string, redirectPath: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Magic-link sign-in needs Supabase to be configured.');
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + redirectPath,
        // Staff accounts are provisioned by an admin, never self-registered.
        shouldCreateUser: false,
      },
    });
    if (error) throw new Error(error.message);
  };

  const loginWithGoogle = async (redirectPath = '/patient/dashboard') => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase) {
      // Only same-site relative paths are accepted as the post-login destination.
      const safePath = redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : '/patient/dashboard';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + safePath,
        },
      });
      if (error) {
        setIsLoading(false);
        throw error;
      }
    } else {
      // Offline / Demo Google Login simulation (Development or Preview Environment when Supabase is not yet configured)
      console.warn('Supabase not configured in environment. Signing in as demonstration patient.');
      const patientDemo = demoAccounts.find(a => a.role === 'patient')!;
      const patientData = initialPatientProfiles.find(p => p.profileId === patientDemo.id) || initialPatientProfiles[0];
      setUser(patientDemo);
      setIsLiveSession(false);
      setPatientProfile(patientData);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(patientDemo));
      localStorage.setItem(AUTH_PATIENT_KEY, JSON.stringify(patientData));
      
      auditLogger.record({
        actorId: patientDemo.id,
        actorName: patientDemo.fullName,
        actorRole: 'patient',
        actionType: 'auth.login',
        targetEntity: 'profiles',
        targetId: patientDemo.id,
        description: 'Patient signed in via Google OAuth (Demonstration Fallback Mode).',
      });
      setIsLoading(false);
    }
  };

  const loginAsDemoUser = (targetRole: UserRole) => {
    // Production Security Guard: Mock / demo logins are strictly forbidden in production builds
    if (!import.meta.env.DEV && isSupabaseConfigured) {
      console.error('Security Violation: Demo and mock authentication are strictly disabled in production builds with live Supabase.');
      return;
    }

    const demo = demoAccounts.find(a => a.role === targetRole) || demoAccounts[0];
    setUser(demo);
    setIsLiveSession(false);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(demo));

    if (targetRole === 'patient') {
      const pat = initialPatientProfiles.find(p => p.profileId === demo.id) || initialPatientProfiles[0];
      setPatientProfile(pat);
      localStorage.setItem(AUTH_PATIENT_KEY, JSON.stringify(pat));
    } else {
      setPatientProfile(null);
      localStorage.removeItem(AUTH_PATIENT_KEY);
    }

    auditLogger.record({
      actorId: demo.id,
      actorName: demo.fullName,
      actorRole: demo.role,
      actionType: 'auth.login',
      targetEntity: 'profiles',
      targetId: demo.id,
      description: `User authenticated into ${targetRole.toUpperCase()} workflow (Development Demo).`,
    });
  };

  const loginAsPatient = (patientId: string): boolean => {
    const foundPatient = initialPatientProfiles.find(p => p.patientId.toLowerCase() === patientId.trim().toLowerCase());
    if (!foundPatient) return false;

    const patientUser: UserProfile = {
      id: foundPatient.profileId || `usr-${foundPatient.patientId}`,
      email: foundPatient.email || `${foundPatient.patientId.toLowerCase()}@patient.satya.local`,
      fullName: foundPatient.fullName,
      role: 'patient',
      phone: foundPatient.phone,
      isActive: true,
      createdAt: foundPatient.createdAt,
    };

    setUser(patientUser);
    setIsLiveSession(false);
    setPatientProfile(foundPatient);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(patientUser));
    localStorage.setItem(AUTH_PATIENT_KEY, JSON.stringify(foundPatient));

    auditLogger.record({
      actorId: patientUser.id,
      actorName: patientUser.fullName,
      actorRole: 'patient',
      actionType: 'auth.login',
      targetEntity: 'patient_profiles',
      targetId: foundPatient.id,
      description: `Patient logged into portal via Hospital Patient ID: ${foundPatient.patientId}`,
    });

    return true;
  };

  const logout = async () => {
    if (user) {
      auditLogger.record({
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        actionType: 'auth.logout',
        targetEntity: 'profiles',
        targetId: user.id,
        description: 'User initiated secure session termination.',
      });
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }

    setUser(null);
    setPatientProfile(null);
    setIsLiveSession(false);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_PATIENT_KEY);
  };

  const updateRole = (newRole: UserRole) => {
    loginAsDemoUser(newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        patientProfile,
        role: user?.role || 'patient',
        isAuthenticated: Boolean(user),
        isLoading,
        isLiveSession,
        signInWithEmail,
        sendMagicLink,
        loginWithGoogle,
        loginAsDemoUser,
        loginAsPatient,
        logout,
        updateRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
