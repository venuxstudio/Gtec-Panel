import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
  importStandardCourses: () => Promise<void>;
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
  const { user, authReady } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!authReady) return;
    if (!user || !user.emailVerified) {
      setCourses([]);
      setStudents([]);
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
      where('ownerId', '==', user.uid)
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
      where('ownerId', '==', user.uid)
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
  }, [authReady, user]);

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
    if (!user) throw new Error('Not authenticated');
    const cleanSoftwares = sanitizeSoftwares(input.softwares);
    if (cleanSoftwares.length === 0) {
      throw new Error('Please add at least one software module with full and short names.');
    }
    const courseId = makeDocumentId('crs');
    const durationDays = durationToDays(input.durationValue, input.durationUnit);
    const payload = {
      ownerId: user.uid,
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
    if (!user) throw new Error('Not authenticated');
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
    if (!user) throw new Error('Not authenticated');
    try {
      await deleteDoc(doc(db, 'courses', courseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}`);
    }
  };

  const importStandardCourses = async () => {
    if (!user) throw new Error('Not authenticated');
    const existingShorts = new Set(courses.map((c) => c.shortName.toUpperCase()));
    const toCreate = STANDARD_GTEC_COURSES.filter(
      (tpl) => !existingShorts.has(tpl.shortName.toUpperCase())
    );
    if (toCreate.length === 0) return;

    const batch = writeBatch(db);
    for (const tpl of toCreate) {
      const courseId = makeDocumentId('crs');
      batch.set(doc(db, 'courses', courseId), {
        ownerId: user.uid,
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'courses');
    }
  };

  const resolveCourseFields = (course1Id: string, course2Id: string) => {
    const c1 = courses.find((c) => c.id === course1Id);
    if (!c1) throw new Error('Selected primary course does not exist.');
    const c2 = course2Id && course2Id !== course1Id ? courses.find((c) => c.id === course2Id) : undefined;

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
    if (!user) throw new Error('Not authenticated');
    const resolved = resolveCourseFields(input.course1Id, input.course2Id);
    const studentId = makeDocumentId('stu');
    const payload = {
      ownerId: user.uid,
      name: input.name.trim().slice(0, 120),
      branch: input.branch,
      ...resolved,
      joiningDate: input.joiningDate,
      examDate: input.examDate || '',
      contact: input.contact.trim().slice(0, 30),
      completedSoftwares: [] as string[],
      status: input.status || 'ongoing',
      notes: (input.notes || '').trim().slice(0, 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'students', studentId), payload);
      return studentId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `students/${studentId}`);
    }
  };

  const updateStudent = async (studentId: string, input: StudentInput) => {
    if (!user) throw new Error('Not authenticated');
    const resolved = resolveCourseFields(input.course1Id, input.course2Id);
    const existing = students.find((s) => s.id === studentId);
    const payload = {
      name: input.name.trim().slice(0, 120),
      branch: input.branch,
      ...resolved,
      joiningDate: input.joiningDate,
      examDate: input.examDate || '',
      contact: input.contact.trim().slice(0, 30),
      completedSoftwares: (existing?.completedSoftwares || []).slice(0, 24),
      status: input.status || existing?.status || 'ongoing',
      notes: (input.notes || '').trim().slice(0, 500),
      updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(doc(db, 'students', studentId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!user) throw new Error('Not authenticated');
    try {
      // Remove attendance subcollection records first to prevent orphaned docs
      const attSnap = await getDocs(
        query(
          collection(db, 'students', studentId, 'attendance'),
          where('ownerId', '==', user.uid)
        )
      );
      const batch = writeBatch(db);
      attSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'students', studentId));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
    }
  };

  const toggleStudentSoftware = async (student: Student, softwareKey: string) => {
    if (!user) throw new Error('Not authenticated');
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
    if (!user) throw new Error('Not authenticated');
    const target = students.find((s) => s.id === studentId);
    try {
      await updateDoc(doc(db, 'students', studentId), {
        completedSoftwares: (target?.completedSoftwares || []).slice(0, 24),
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const updateStudentExamDate = async (studentId: string, examDate: string, notes: string) => {
    if (!user) throw new Error('Not authenticated');
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
    if (!user) throw new Error('Not authenticated');
    const attRef = doc(db, 'students', student.id, 'attendance', date);
    try {
      const existingSnap = await getDocs(
        query(
          collection(db, 'students', student.id, 'attendance'),
          where('ownerId', '==', user.uid),
          where('date', '==', date)
        )
      );
      if (existingSnap.empty) {
        await setDoc(attRef, {
          ownerId: user.uid,
          studentId: student.id,
          branch: student.branch,
          date,
          status,
          remark: remark.trim().slice(0, 200),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
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
      if (!user) return [];
      const path = `students/${studentId}/attendance`;
      try {
        const snap = await getDocs(
          query(collection(db, path), where('ownerId', '==', user.uid))
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
    [user]
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
