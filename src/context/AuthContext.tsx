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
  loginWithGoogle: () => Promise<void>;
  loginAsDemoUser: (role: UserRole) => void;
  loginAsPatient: (patientId: string) => boolean;
  logout: () => Promise<void>;
  updateRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'satya_auth_user';
const AUTH_PATIENT_KEY = 'satya_auth_patient';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);

      // Check live Supabase session if configured
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Retrieve profile from DB
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              const userObj: UserProfile = {
                id: profile.id,
                email: profile.email,
                fullName: profile.full_name,
                role: profile.role,
                phone: profile.phone,
                isActive: profile.is_active,
                createdAt: profile.created_at,
              };
              setUser(userObj);

              if (profile.role === 'patient') {
                const { data: pat } = await supabase
                  .from('patient_profiles')
                  .select('*')
                  .eq('profile_id', profile.id)
                  .single();
                if (pat) setPatientProfile(pat);
              }
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
          const parsedUser = JSON.parse(storedUser);
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
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/patient/dashboard',
        },
      });
      if (error) {
        setIsLoading(false);
        throw error;
      }
    } else if (import.meta.env.DEV) {
      // Offline / Demo Google Login simulation (Development environment only)
      const patientDemo = demoAccounts.find(a => a.role === 'patient')!;
      const patientData = initialPatientProfiles.find(p => p.profileId === patientDemo.id) || initialPatientProfiles[0];
      setUser(patientDemo);
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
        description: 'Patient signed in via Google OAuth (Development Simulation Mode).',
      });
      setIsLoading(false);
    } else {
      setIsLoading(false);
      throw new Error('Supabase authentication service is not configured for production deployment.');
    }
  };

  const loginAsDemoUser = (targetRole: UserRole) => {
    // Production Security Guard: Mock / demo logins are strictly forbidden in production builds
    if (!import.meta.env.DEV) {
      console.error('Security Violation: Demo and mock authentication are strictly disabled in production builds.');
      return;
    }

    const demo = demoAccounts.find(a => a.role === targetRole) || demoAccounts[0];
    setUser(demo);
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
