import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DocumentReference,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import { hashSecret, makeDocumentId } from '../lib/duration';
import { BranchId, Trainer, TrainerCredentials } from '../types';

export interface CreateTrainerInput {
  name: string;
  designation: string;
  branches: BranchId[];
  branchSchedules: Partial<Record<BranchId, string>>;
  softwares: string[];
  passkey: string;
  recoveryQuestion: string;
  recoveryAnswer: string;
}

export interface UpdateTrainerInput {
  name: string;
  designation: string;
  branches: BranchId[];
  branchSchedules: Partial<Record<BranchId, string>>;
  softwares: string[];
  dashboardConfigured?: boolean;
}

interface AuthContextValue {
  trainers: Trainer[];
  trainersLoading: boolean;
  activeTrainer: Trainer | null;
  authReady: boolean;
  createTrainer: (input: CreateTrainerInput) => Promise<string>;
  verifyAndLogin: (
    trainerId: string,
    passkey: string
  ) => Promise<{ ok: boolean; dashboardConfigured: boolean }>;
  getRecoveryQuestion: (trainerId: string) => Promise<string>;
  resetPasskeyWithRecovery: (
    trainerId: string,
    answer: string,
    newPasskey: string
  ) => Promise<{ ok: boolean; dashboardConfigured: boolean; error?: string }>;
  updateTrainerProfile: (trainerId: string, input: UpdateTrainerInput) => Promise<void>;
  markDashboardConfigured: (trainerId: string) => Promise<void>;
  changeTrainerPasskey: (
    trainerId: string,
    currentPasskey: string,
    newPasskey: string
  ) => Promise<{ ok: boolean; error?: string }>;
  verifyTrainerPasskey: (
    trainerId: string,
    passkey: string
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteTrainerAccount: (
    trainerId: string,
    passkey: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACTIVE_TRAINER_KEY = 'gtec_active_trainer_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [activeTrainerId, setActiveTrainerId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ACTIVE_TRAINER_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const trainersQuery = query(
      collection(db, 'trainers'),
      where('dashboardConfigured', 'in', [true, false])
    );
    const unsub = onSnapshot(
      trainersQuery,
      (snapshot) => {
        const list: Trainer[] = snapshot.docs.map((d) => ({
          ...(d.data() as Omit<Trainer, 'id'>),
          id: d.id,
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setTrainers(list);
        setTrainersLoading(false);
      },
      (error) => {
        setTrainersLoading(false);
        console.error('Trainers listener error:', error);
      }
    );
    return () => unsub();
  }, []);

  const activeTrainer = useMemo(
    () => trainers.find((t) => t.id === activeTrainerId) || null,
    [trainers, activeTrainerId]
  );

  // Clear stale session ID if trainer doc was deleted
  useEffect(() => {
    if (!trainersLoading && activeTrainerId && !activeTrainer) {
      setActiveTrainerId(null);
      try {
        sessionStorage.removeItem(ACTIVE_TRAINER_KEY);
      } catch {
        // ignore
      }
    }
  }, [trainersLoading, activeTrainerId, activeTrainer]);

  const persistSession = (trainerId: string | null) => {
    setActiveTrainerId(trainerId);
    try {
      if (trainerId) {
        sessionStorage.setItem(ACTIVE_TRAINER_KEY, trainerId);
      } else {
        sessionStorage.removeItem(ACTIVE_TRAINER_KEY);
      }
    } catch {
      // ignore
    }
  };

  const sanitizeSoftwares = (list: string[]): string[] =>
    Array.from(
      new Set(
        list
          .map((s) => s.trim().toUpperCase().slice(0, 40))
          .filter((s) => s.length > 0)
      )
    ).slice(0, 20);

  const createTrainer = async (input: CreateTrainerInput): Promise<string> => {
    const trainerId = makeDocumentId('trn');
    const passkeyHash = await hashSecret(trainerId, input.passkey);
    const recoveryAnswerHash = await hashSecret(
      trainerId,
      input.recoveryAnswer.trim().toLowerCase()
    );

    const cleanBranches: BranchId[] =
      input.branches.length > 0 ? input.branches.slice(0, 2) : ['MAVELIKARA'];

    const cleanSchedules: Partial<Record<BranchId, string>> = {};
    cleanBranches.forEach((b) => {
      cleanSchedules[b] =
        (input.branchSchedules[b] || '').trim() ||
        (b === 'MAVELIKARA' ? 'Tue, Thu, Fri' : 'Mon, Wed, Sat');
    });

    const cleanSoftwares = sanitizeSoftwares(input.softwares);
    const cleanName = input.name.trim().slice(0, 100);
    const cleanDesignation = input.designation.trim().slice(0, 100);
    if (!cleanName || !cleanDesignation) {
      throw new Error('Trainer name and designation cannot be empty.');
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'trainers', trainerId), {
      name: cleanName,
      designation: cleanDesignation,
      branches: cleanBranches,
      branchSchedules: cleanSchedules,
      softwares: cleanSoftwares,
      ongoingCount: 0,
      completedCount: 0,
      attendanceCount: 0,
      dashboardConfigured: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'trainers', trainerId, 'credentials', 'auth'), {
      trainerId,
      passkeyHash,
      recoveryQuestion: input.recoveryQuestion.trim().slice(0, 160),
      recoveryAnswerHash,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await Promise.race([
        batch.commit(),
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () =>
              reject(
                new Error(
                  'Timed out connecting to Firestore. Check your internet connection and try again.'
                )
              ),
            15000
          )
        ),
      ]);

      // Optimistically show the newly created trainer card immediately
      const optimisticTrainer: Trainer = {
        id: trainerId,
        name: cleanName,
        designation: cleanDesignation,
        branches: cleanBranches,
        branchSchedules: cleanSchedules,
        softwares: cleanSoftwares,
        ongoingCount: 0,
        completedCount: 0,
        attendanceCount: 0,
        dashboardConfigured: false,
      };
      setTrainers((prev) => {
        if (prev.some((t) => t.id === trainerId)) return prev;
        return [...prev, optimisticTrainer].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });
      return trainerId;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Timed out')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.CREATE, `trainers/${trainerId}`);
    }
  };

  const verifyAndLogin = async (
    trainerId: string,
    passkey: string
  ): Promise<{ ok: boolean; dashboardConfigured: boolean }> => {
    const path = `trainers/${trainerId}/credentials/auth`;
    let snap;
    try {
      snap = await getDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    if (!snap.exists()) {
      return { ok: false, dashboardConfigured: false };
    }

    const creds = snap.data() as TrainerCredentials;
    const candidateHash = await hashSecret(trainerId, passkey);
    if (candidateHash !== creds.passkeyHash) {
      return { ok: false, dashboardConfigured: false };
    }

    const trainer = trainers.find((t) => t.id === trainerId);
    persistSession(trainerId);
    return {
      ok: true,
      dashboardConfigured: Boolean(trainer?.dashboardConfigured),
    };
  };

  const getRecoveryQuestion = async (trainerId: string): Promise<string> => {
    const path = `trainers/${trainerId}/credentials/auth`;
    try {
      const snap = await getDoc(doc(db, path));
      if (!snap.exists()) return '';
      const creds = snap.data() as TrainerCredentials;
      return creds.recoveryQuestion || '';
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  };

  const resetPasskeyWithRecovery = async (
    trainerId: string,
    answer: string,
    newPasskey: string
  ): Promise<{ ok: boolean; dashboardConfigured: boolean; error?: string }> => {
    if (newPasskey.trim().length < 4) {
      return {
        ok: false,
        dashboardConfigured: false,
        error: 'New passkey must be at least 4 characters.',
      };
    }

    const path = `trainers/${trainerId}/credentials/auth`;
    let snap;
    try {
      snap = await getDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    if (!snap.exists()) {
      return {
        ok: false,
        dashboardConfigured: false,
        error: 'Trainer credentials not found.',
      };
    }

    const creds = snap.data() as TrainerCredentials;
    const candidateAnswerHash = await hashSecret(
      trainerId,
      answer.trim().toLowerCase()
    );
    if (candidateAnswerHash !== creds.recoveryAnswerHash) {
      return {
        ok: false,
        dashboardConfigured: false,
        error: 'Recovery answer does not match. Please try again.',
      };
    }

    const newPasskeyHash = await hashSecret(trainerId, newPasskey);
    try {
      await updateDoc(doc(db, path), {
        passkeyHash: newPasskeyHash,
        updatedAt: serverTimestamp(),
      });
      const trainer = trainers.find((t) => t.id === trainerId);
      persistSession(trainerId);
      return {
        ok: true,
        dashboardConfigured: Boolean(trainer?.dashboardConfigured),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateTrainerProfile = async (
    trainerId: string,
    input: UpdateTrainerInput
  ) => {
    const cleanBranches: BranchId[] =
      input.branches.length > 0 ? input.branches.slice(0, 2) : ['MAVELIKARA'];

    const cleanSchedules: Partial<Record<BranchId, string>> = {};
    cleanBranches.forEach((b) => {
      cleanSchedules[b] =
        (input.branchSchedules[b] || '').trim() ||
        (b === 'MAVELIKARA' ? 'Tue, Thu, Fri' : 'Mon, Wed, Sat');
    });

    const cleanName = input.name.trim().slice(0, 100);
    const cleanDesignation = input.designation.trim().slice(0, 100);
    if (!cleanName || !cleanDesignation) {
      throw new Error('Trainer name and designation cannot be empty.');
    }

    const payload: Record<string, unknown> = {
      name: cleanName,
      designation: cleanDesignation,
      branches: cleanBranches,
      branchSchedules: cleanSchedules,
      softwares: sanitizeSoftwares(input.softwares),
      updatedAt: serverTimestamp(),
    };
    if (typeof input.dashboardConfigured === 'boolean') {
      payload.dashboardConfigured = input.dashboardConfigured;
    }

    try {
      await updateDoc(doc(db, 'trainers', trainerId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainers/${trainerId}`);
    }
  };

  const markDashboardConfigured = async (trainerId: string) => {
    const trainer = trainers.find((t) => t.id === trainerId);
    if (trainer?.dashboardConfigured) return;
    try {
      await updateDoc(doc(db, 'trainers', trainerId), {
        dashboardConfigured: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainers/${trainerId}`);
    }
  };

  const changeTrainerPasskey = async (
    trainerId: string,
    currentPasskey: string,
    newPasskey: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (newPasskey.trim().length < 4) {
      return { ok: false, error: 'New passkey must be at least 4 characters.' };
    }
    const path = `trainers/${trainerId}/credentials/auth`;
    let snap;
    try {
      snap = await getDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    if (!snap.exists()) return { ok: false, error: 'Credentials not found.' };
    const creds = snap.data() as TrainerCredentials;
    const currentHash = await hashSecret(trainerId, currentPasskey);
    if (currentHash !== creds.passkeyHash) {
      return { ok: false, error: 'Current passkey is incorrect.' };
    }
    const nextHash = await hashSecret(trainerId, newPasskey);
    try {
      await updateDoc(doc(db, path), {
        passkeyHash: nextHash,
        updatedAt: serverTimestamp(),
      });
      return { ok: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const verifyTrainerPasskey = async (
    trainerId: string,
    passkey: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!activeTrainerId || activeTrainerId !== trainerId) {
      return {
        ok: false,
        error: 'Only the currently logged-in trainer can delete this Trainer ID.',
      };
    }
    if (!passkey.trim()) {
      return { ok: false, error: 'Please enter your login passkey.' };
    }
    const path = `trainers/${trainerId}/credentials/auth`;
    let snap;
    try {
      snap = await getDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    if (!snap.exists()) {
      return { ok: false, error: 'Trainer credentials not found.' };
    }
    const creds = snap.data() as TrainerCredentials;
    const candidateHash = await hashSecret(trainerId, passkey);
    if (candidateHash !== creds.passkeyHash) {
      return { ok: false, error: 'Incorrect passkey. Please try again.' };
    }
    return { ok: true };
  };

  const deleteTrainerAccount = async (
    trainerId: string,
    passkey: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const authCheck = await verifyTrainerPasskey(trainerId, passkey);
    if (!authCheck.ok) {
      return authCheck;
    }

    try {
      const refsToDelete: DocumentReference[] = [];

      const [studentsSnap, coursesSnap] = await Promise.all([
        getDocs(query(collection(db, 'students'), where('trainerId', '==', trainerId))),
        getDocs(query(collection(db, 'courses'), where('trainerId', '==', trainerId))),
      ]);

      // Delete each student's attendance records BEFORE deleting the student doc
      for (let i = 0; i < studentsSnap.docs.length; i += 10) {
        const chunk = studentsSnap.docs.slice(i, i + 10);
        const attSnaps = await Promise.all(
          chunk.map((sDoc) =>
            getDocs(
              query(
                collection(db, 'students', sDoc.id, 'attendance'),
                where('trainerId', '==', trainerId)
              )
            )
          )
        );
        attSnaps.forEach((snap) => {
          snap.docs.forEach((d) => refsToDelete.push(d.ref));
        });
      }

      studentsSnap.docs.forEach((d) => refsToDelete.push(d.ref));
      coursesSnap.docs.forEach((d) => refsToDelete.push(d.ref));
      refsToDelete.push(doc(db, 'trainers', trainerId, 'credentials', 'auth'));
      refsToDelete.push(doc(db, 'trainers', trainerId));

      const BATCH_LIMIT = 400;
      for (let i = 0; i < refsToDelete.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        refsToDelete.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
        await batch.commit();
      }

      if (activeTrainerId === trainerId) {
        persistSession(null);
      }
      return { ok: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trainers/${trainerId}`);
    }
  };

  const logout = () => {
    persistSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        trainers,
        trainersLoading,
        activeTrainer,
        authReady: !trainersLoading,
        createTrainer,
        verifyAndLogin,
        getRecoveryQuestion,
        resetPasskeyWithRecovery,
        updateTrainerProfile,
        markDashboardConfigured,
        changeTrainerPasskey,
        verifyTrainerPasskey,
        deleteTrainerAccount,
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
