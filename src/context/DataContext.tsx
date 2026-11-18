import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import { STANDARD_GTEC_COURSES, durationToDays, makeDocumentId } from '../lib/duration';
import {
  AttendanceRecord,
  AttendanceStatus,
  BranchId,
  Course,
  DurationUnit,
  SoftwareItem,
  Student,
  StudentStatus,
} from '../types';
import { useAuth } from './AuthContext';

export interface CourseInput {
  shortName: string;
  fullName: string;
  durationValue: number;
  durationUnit: DurationUnit;
  softwares: SoftwareItem[];
}

export interface StudentInput {
  regNo: string;
  name: string;
  branch: BranchId;
  course1Id: string;
  course2Id: string;
  joiningDate: string;
  examDate: string;
  contact: string;
  notes: string;
  status?: StudentStatus;
}

interface DataContextValue {
  courses: Course[];
  students: Student[];
  loading: boolean;
  addCourse: (input: CourseInput) => Promise<string>;
  updateCourse: (courseId: string, input: CourseInput) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  importStandardCourses: () => Promise<{ addedCount: number }>;
  addStudent: (input: StudentInput) => Promise<string>;
  updateStudent: (studentId: string, input: StudentInput) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  toggleStudentSoftware: (student: Student, softwareKey: string) => Promise<void>;
  updateStudentStatus: (studentId: string, status: StudentStatus) => Promise<void>;
  updateStudentExamDate: (studentId: string, examDate: string, notes: string) => Promise<void>;
  markAttendance: (
    student: Student,
    date: string,
    status: AttendanceStatus,
    remark?: string
  ) => Promise<void>;
  fetchStudentAttendance: (studentId: string) => Promise<AttendanceRecord[]>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { activeTrainer, authReady } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const latestAttendanceCountRef = useRef<number>(0);

  const trainerId = activeTrainer?.id || null;

  useEffect(() => {
    latestAttendanceCountRef.current = activeTrainer?.attendanceCount || 0;
  }, [activeTrainer?.id, activeTrainer?.attendanceCount]);

  useEffect(() => {
    if (!authReady) return;
    setCourses([]);
    setStudents([]);
    if (!trainerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let coursesLoaded = false;
    let studentsLoaded = false;

    const checkDone = () => {
      if (coursesLoaded && studentsLoaded) {
        setLoading(false);
      }
    };

    const coursesQuery = query(
      collection(db, 'courses'),
      where('trainerId', '==', trainerId)
    );
    const unsubCourses = onSnapshot(
      coursesQuery,
      (snapshot) => {
        const list: Course[] = snapshot.docs.map((d) => ({
          ...(d.data() as Omit<Course, 'id'>),
          id: d.id,
        }));
        list.sort((a, b) => a.shortName.localeCompare(b.shortName));
        setCourses(list);
        coursesLoaded = true;
        checkDone();
      },
      (error) => {
        coursesLoaded = true;
        checkDone();
        handleFirestoreError(error, OperationType.LIST, 'courses');
      }
    );

    const studentsQuery = query(
      collection(db, 'students'),
      where('trainerId', '==', trainerId)
    );
    const unsubStudents = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const list: Student[] = snapshot.docs.map((d) => ({
          ...(d.data() as Omit<Student, 'id'>),
          id: d.id,
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(list);
        studentsLoaded = true;
        checkDone();
      },
      (error) => {
        studentsLoaded = true;
        checkDone();
        handleFirestoreError(error, OperationType.LIST, 'students');
      }
    );

    return () => {
      unsubCourses();
      unsubStudents();
    };
  }, [authReady, trainerId]);

  const syncTrainerStats = useCallback(
    async (nextStudentsList: Student[], attendanceDelta = 0) => {
      if (!trainerId) return;
      const ongoingCount = nextStudentsList.filter((s) => s.status === 'ongoing').length;
      const completedCount = nextStudentsList.filter((s) => s.status === 'completed').length;
      const nextAttCount = Math.max(0, latestAttendanceCountRef.current + attendanceDelta);
      latestAttendanceCountRef.current = nextAttCount;
      try {
        await updateDoc(doc(db, 'trainers', trainerId), {
          ongoingCount,
          completedCount,
          attendanceCount: nextAttCount,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `trainers/${trainerId}`);
      }
    },
    [trainerId]
  );

  const sanitizeSoftwares = (items: SoftwareItem[]): SoftwareItem[] => {
    return items
      .map((item) => ({
        fullName: item.fullName.trim().slice(0, 100),
        shortName: item.shortName.trim().toUpperCase().slice(0, 20),
      }))
      .filter((item) => item.fullName.length > 0 && item.shortName.length > 0)
      .slice(0, 12);
  };

  const addCourse = async (input: CourseInput): Promise<string> => {
    if (!trainerId) throw new Error('No active trainer session');
    const cleanSoftwares = sanitizeSoftwares(input.softwares);
    if (cleanSoftwares.length === 0) {
      throw new Error('Please add at least one software module with full and short names.');
    }
    const courseId = makeDocumentId('crs');
    const durationDays = durationToDays(input.durationValue, input.durationUnit);
    const payload = {
      trainerId,
      shortName: input.shortName.trim().toUpperCase().slice(0, 30),
      fullName: input.fullName.trim().slice(0, 160),
      durationValue: Math.max(1, Math.min(1825, Math.round(input.durationValue || 1))),
      durationUnit: input.durationUnit,
      durationDays,
      softwares: cleanSoftwares,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'courses', courseId), payload);
      return courseId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `courses/${courseId}`);
    }
  };

  const updateCourse = async (courseId: string, input: CourseInput) => {
    if (!trainerId) throw new Error('No active trainer session');
    const cleanSoftwares = sanitizeSoftwares(input.softwares);
    if (cleanSoftwares.length === 0) {
      throw new Error('Please add at least one software module.');
    }
    const durationDays = durationToDays(input.durationValue, input.durationUnit);
    const payload = {
      shortName: input.shortName.trim().toUpperCase().slice(0, 30),
      fullName: input.fullName.trim().slice(0, 160),
      durationValue: Math.max(1, Math.min(1825, Math.round(input.durationValue || 1))),
      durationUnit: input.durationUnit,
      durationDays,
      softwares: cleanSoftwares,
      updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(doc(db, 'courses', courseId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${courseId}`);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!trainerId) throw new Error('No active trainer session');
    try {
      await deleteDoc(doc(db, 'courses', courseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}`);
    }
  };

  const importStandardCourses = async (): Promise<{ addedCount: number }> => {
    if (!trainerId) throw new Error('No active trainer session');
    const existingShorts = new Set(courses.map((c) => c.shortName.toUpperCase()));
    const toCreate = STANDARD_GTEC_COURSES.filter(
      (tpl) => !existingShorts.has(tpl.shortName.toUpperCase())
    );
    if (toCreate.length === 0) return { addedCount: 0 };

    const batch = writeBatch(db);
    for (const tpl of toCreate) {
      const courseId = makeDocumentId('crs');
      batch.set(doc(db, 'courses', courseId), {
        trainerId,
        shortName: tpl.shortName,
        fullName: tpl.fullName,
        durationValue: tpl.durationValue,
        durationUnit: tpl.durationUnit,
        durationDays: tpl.durationDays,
        softwares: tpl.softwares,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      return { addedCount: toCreate.length };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'courses');
    }
  };

  const resolveCourseFields = (course1Id: string, course2Id: string) => {
    const c1 = courses.find((c) => c.id === course1Id);
    if (!c1) throw new Error('Selected primary course does not exist.');
    const c2 =
      course2Id && course2Id !== course1Id
        ? courses.find((c) => c.id === course2Id)
        : undefined;

    const c1Days = Math.max(1, c1.durationDays);
    const c2Days = c2 ? Math.max(1, c2.durationDays) : 0;
    const totalDurationDays = Math.min(3650, c1Days + c2Days);

    return {
      course1Id: c1.id,
      course1Short: c1.shortName.slice(0, 30),
      course1Full: c1.fullName.slice(0, 160),
      course1DurationDays: c1Days,
      course2Id: c2 ? c2.id : '',
      course2Short: c2 ? c2.shortName.slice(0, 30) : '',
      course2Full: c2 ? c2.fullName.slice(0, 160) : '',
      course2DurationDays: c2Days,
      totalDurationDays,
    };
  };

  const addStudent = async (input: StudentInput): Promise<string> => {
    if (!trainerId) throw new Error('No active trainer session');
    const resolved = resolveCourseFields(input.course1Id, input.course2Id);
    const studentId = makeDocumentId('stu');
    const statusValue: StudentStatus = input.status || 'ongoing';
    const payload = {
      trainerId,
      regNo: (input.regNo || '').trim().slice(0, 40),
      name: input.name.trim().slice(0, 120),
      branch: input.branch,
      ...resolved,
      joiningDate: input.joiningDate,
      examDate: input.examDate || '',
      contact: input.contact.trim().slice(0, 30),
      completedSoftwares: [] as string[],
      status: statusValue,
      notes: (input.notes || '').trim().slice(0, 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'students', studentId), payload);
      const nextList = [...students, { ...payload, id: studentId } as Student];
      await syncTrainerStats(nextList, 0);
      return studentId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `students/${studentId}`);
    }
  };

  const updateStudent = async (studentId: string, input: StudentInput) => {
    if (!trainerId) throw new Error('No active trainer session');
    const resolved = resolveCourseFields(input.course1Id, input.course2Id);
    const existing = students.find((s) => s.id === studentId);
    const nextStatus = input.status || existing?.status || 'ongoing';
    const payload = {
      regNo: (input.regNo || '').trim().slice(0, 40),
      name: input.name.trim().slice(0, 120),
      branch: input.branch,
      ...resolved,
      joiningDate: input.joiningDate,
      examDate: input.examDate || '',
      contact: input.contact.trim().slice(0, 30),
      completedSoftwares: (existing?.completedSoftwares || []).slice(0, 24),
      status: nextStatus,
      notes: (input.notes || '').trim().slice(0, 500),
      updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(doc(db, 'students', studentId), payload);
      const nextList = students.map((s) =>
        s.id === studentId ? { ...s, status: nextStatus } : s
      );
      await syncTrainerStats(nextList, 0);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!trainerId) throw new Error('No active trainer session');
    try {
      const attSnap = await getDocs(
        query(
          collection(db, 'students', studentId, 'attendance'),
          where('trainerId', '==', trainerId)
        )
      );
      const refsToDelete = [...attSnap.docs.map((d) => d.ref), doc(db, 'students', studentId)];
      const BATCH_LIMIT = 400;
      for (let i = 0; i < refsToDelete.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        refsToDelete.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
        await batch.commit();
      }
      const nextList = students.filter((s) => s.id !== studentId);
      await syncTrainerStats(nextList, -attSnap.size);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
    }
  };

  const toggleStudentSoftware = async (student: Student, softwareKey: string) => {
    if (!trainerId) throw new Error('No active trainer session');
    const exists = student.completedSoftwares.includes(softwareKey);
    const next = exists
      ? student.completedSoftwares.filter((k) => k !== softwareKey)
      : [...student.completedSoftwares, softwareKey].slice(0, 24);
    try {
      await updateDoc(doc(db, 'students', student.id), {
        completedSoftwares: next,
        status: student.status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${student.id}`);
    }
  };

  const updateStudentStatus = async (studentId: string, status: StudentStatus) => {
    if (!trainerId) throw new Error('No active trainer session');
    const target = students.find((s) => s.id === studentId);
    try {
      await updateDoc(doc(db, 'students', studentId), {
        completedSoftwares: (target?.completedSoftwares || []).slice(0, 24),
        status,
        updatedAt: serverTimestamp(),
      });
      const nextList = students.map((s) =>
        s.id === studentId ? { ...s, status } : s
      );
      await syncTrainerStats(nextList, 0);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const updateStudentExamDate = async (studentId: string, examDate: string, notes: string) => {
    if (!trainerId) throw new Error('No active trainer session');
    try {
      await updateDoc(doc(db, 'students', studentId), {
        examDate: examDate || '',
        notes: notes.trim().slice(0, 500),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const markAttendance = async (
    student: Student,
    date: string,
    status: AttendanceStatus,
    remark = ''
  ) => {
    if (!trainerId) throw new Error('No active trainer session');
    const attRef = doc(db, 'students', student.id, 'attendance', date);
    try {
      const existingSnap = await getDocs(
        query(
          collection(db, 'students', student.id, 'attendance'),
          where('trainerId', '==', trainerId),
          where('date', '==', date)
        )
      );
      if (existingSnap.empty) {
        await setDoc(attRef, {
          trainerId,
          studentId: student.id,
          branch: student.branch,
          date,
          status,
          remark: remark.trim().slice(0, 200),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await syncTrainerStats(students, 1);
      } else {
        await updateDoc(attRef, {
          status,
          remark: remark.trim().slice(0, 200),
          branch: student.branch,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `students/${student.id}/attendance/${date}`
      );
    }
  };

  const fetchStudentAttendance = useCallback(
    async (studentId: string): Promise<AttendanceRecord[]> => {
      if (!trainerId) return [];
      const path = `students/${studentId}/attendance`;
      try {
        const snap = await getDocs(
          query(collection(db, path), where('trainerId', '==', trainerId))
        );
        const list = snap.docs.map((d) => ({
          ...(d.data() as Omit<AttendanceRecord, 'id'>),
          id: d.id,
        }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    },
    [trainerId]
  );

  return (
    <DataContext.Provider
      value={{
        courses,
        students,
        loading,
        addCourse,
        updateCourse,
        deleteCourse,
        importStandardCourses,
        addStudent,
        updateStudent,
        deleteStudent,
        toggleStudentSoftware,
        updateStudentStatus,
        updateStudentExamDate,
        markAttendance,
        fetchStudentAttendance,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
