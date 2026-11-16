import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { OperationType, auth, db, googleProvider, handleFirestoreError } from '../lib/firebase';
import { hashPin } from '../lib/duration';
import { UserProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  isLocked: boolean;
  hasPinConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (identifier: string, password: string) => Promise<void>;
  registerWithEmail: (
    name: string,
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendEmailSignInLink: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserStatus: () => Promise<boolean>;
  saveQuickPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  lockSession: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const EMAIL_LINK_KEY = 'gtec_email_for_signin';
const USERNAME_MAP_KEY = 'gtec_username_email_map';
const LOCKED_SESSION_KEY = 'gtec_session_locked';

function getStoredEmailForUsername(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) return trimmed;
  try {
    const raw = localStorage.getItem(USERNAME_MAP_KEY);
    if (!raw) return trimmed;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[trimmed.toLowerCase()] || trimmed;
  } catch {
    return trimmed;
  }
}

function saveUsernameEmailMapping(username: string, email: string) {
  try {
    const raw = localStorage.getItem(USERNAME_MAP_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[username.trim().toLowerCase()] = email.trim();
    localStorage.setItem(USERNAME_MAP_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota issues
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOCKED_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const syncUserProfile = useCallback(async (firebaseUser: User, explicitUsername?: string) => {
    if (!firebaseUser.emailVerified) {
      setProfile(null);
      return;
    }

    const userRef = doc(db, 'users', firebaseUser.uid);
    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
    }

    const email = (firebaseUser.email || '').slice(0, 254);
    const displayName = (firebaseUser.displayName || email.split('@')[0] || 'Instructor').slice(0, 100);
    const username = (explicitUsername || email.split('@')[0] || 'instructor').slice(0, 60);

    if (email && username) {
      saveUsernameEmailMapping(username, email);
    }

    if (!snap.exists()) {
      const payload = {
        uid: firebaseUser.uid,
        email,
        displayName,
        username,
        pinHash: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(userRef, payload);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
      }
      setProfile({
        uid: firebaseUser.uid,
        email,
        displayName,
        username,
        pinHash: '',
      });
    } else {
      const data = snap.data() as UserProfile;
      setProfile(data);
      if (data.username && data.email) {
        saveUsernameEmailMapping(data.username, data.email);
      }
    }
  }, []);

  // Complete passwordless email-link sign-in if returning from email link
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = '';
      try {
        email = localStorage.getItem(EMAIL_LINK_KEY) || '';
      } catch {
        email = '';
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            try {
              localStorage.removeItem(EMAIL_LINK_KEY);
              window.history.replaceState({}, document.title, '/branches');
            } catch {
              // ignore
            }
          })
          .catch((err) => {
            console.error('Email link sign-in failed:', err);
          });
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await syncUserProfile(firebaseUser);
        } catch (err) {
          console.error('Profile sync error:', err);
        }
      } else {
        setProfile(null);
        setIsLocked(false);
        try {
          localStorage.removeItem(LOCKED_SESSION_KEY);
        } catch {
          // ignore
        }
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [syncUserProfile]);

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    setIsLocked(false);
    try {
      localStorage.removeItem(LOCKED_SESSION_KEY);
    } catch {
      // ignore
    }
    await syncUserProfile(cred.user);
  };

  const signInWithEmail = async (identifier: string, password: string) => {
    const resolvedEmail = getStoredEmailForUsername(identifier);
    if (!resolvedEmail.includes('@')) {
      throw new Error('Please enter your registered email address to sign in.');
    }
    const cred = await signInWithEmailAndPassword(auth, resolvedEmail, password);
    setIsLocked(false);
    try {
      localStorage.removeItem(LOCKED_SESSION_KEY);
    } catch {
      // ignore
    }
    await syncUserProfile(cred.user);
  };

  const registerWithEmail = async (
    name: string,
    username: string,
    email: string,
    password: string
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    saveUsernameEmailMapping(username, email.trim());
    await sendEmailVerification(cred.user);
  };

  const sendPasswordReset = async (email: string) => {
    const resolvedEmail = getStoredEmailForUsername(email);
    await sendPasswordResetEmail(auth, resolvedEmail);
  };

  const sendEmailSignInLink = async (email: string) => {
    const cleanEmail = getStoredEmailForUsername(email);
    const actionCodeSettings = {
      url: `${window.location.origin}/login`,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);
    try {
      localStorage.setItem(EMAIL_LINK_KEY, cleanEmail);
    } catch {
      // ignore
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  };

  const refreshUserStatus = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const updated = auth.currentUser;
    setUser({ ...updated } as User);
    if (updated.emailVerified) {
      await syncUserProfile(updated);
      return true;
    }
    return false;
  };

  const saveQuickPin = async (pin: string) => {
    if (!user) throw new Error('Must be signed in');
    const pinHash = await hashPin(pin);
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        pinHash,
        updatedAt: serverTimestamp(),
      });
      setProfile((prev) => (prev ? { ...prev, pinHash } : prev));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const unlockWithPin = async (pin: string): Promise<boolean> => {
    if (!profile?.pinHash) return false;
    const candidate = await hashPin(pin);
    if (candidate === profile.pinHash) {
      setIsLocked(false);
      try {
        localStorage.removeItem(LOCKED_SESSION_KEY);
      } catch {
        // ignore
      }
      return true;
    }
    return false;
  };

  const lockSession = () => {
    setIsLocked(true);
    try {
      localStorage.setItem(LOCKED_SESSION_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const logout = async () => {
    setIsLocked(false);
    try {
      localStorage.removeItem(LOCKED_SESSION_KEY);
    } catch {
      // ignore
    }
    await signOut(auth);
  };

  const hasPinConfigured = Boolean(profile?.pinHash && profile.pinHash.length > 0);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authReady,
        isLocked,
        hasPinConfigured,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        sendEmailSignInLink,
        resendVerificationEmail,
        refreshUserStatus,
        saveQuickPin,
        unlockWithPin,
        lockSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
