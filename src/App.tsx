/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { NotificationViewport } from './components/NotificationViewport';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { NotificationProvider } from './context/NotificationContext';
import { HomePage } from './pages/HomePage';

const AddTrainerPage = lazy(() =>
  import('./pages/AddTrainerPage').then((m) => ({ default: m.AddTrainerPage }))
);
const BranchDetailPage = lazy(() =>
  import('./pages/BranchDetailPage').then((m) => ({ default: m.BranchDetailPage }))
);
const BranchesPage = lazy(() =>
  import('./pages/BranchesPage').then((m) => ({ default: m.BranchesPage }))
);
const CourseFormPage = lazy(() =>
  import('./pages/CourseFormPage').then((m) => ({ default: m.CourseFormPage }))
);
const CoursesDirectoryPage = lazy(() =>
  import('./pages/CoursesDirectoryPage').then((m) => ({ default: m.CoursesDirectoryPage }))
);
const StudentDetailPage = lazy(() =>
  import('./pages/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage }))
);
const StudentFormPage = lazy(() =>
  import('./pages/StudentFormPage').then((m) => ({ default: m.StudentFormPage }))
);
const StudentsDirectoryPage = lazy(() =>
  import('./pages/StudentsDirectoryPage').then((m) => ({ default: m.StudentsDirectoryPage }))
);
const TrainerDashboardPage = lazy(() =>
  import('./pages/TrainerDashboardPage').then((m) => ({ default: m.TrainerDashboardPage }))
);

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#090B0E]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
    </div>
  );
}

function TrainerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { activeTrainer, authReady } = useAuth();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090B0E]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
      </div>
    );
  }

  if (!activeTrainer) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AppShell>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trainer/new" element={<AddTrainerPage />} />
        <Route
          path="/dashboard"
          element={
            <TrainerProtectedRoute>
              <TrainerDashboardPage />
            </TrainerProtectedRoute>
          }
        />
        <Route
          path="/branches"
          element={
            <TrainerProtectedRoute>
              <BranchesPage />
            </TrainerProtectedRoute>
          }
        />
        <Route
          path="/branch/:branchId"
          element={
            <TrainerProtectedRoute>
              <BranchDetailPage />
            </TrainerProtectedRoute>
          }
        />
        <Route
          path="/student/:studentId"
          element={
            <TrainerProtectedRoute>
              <StudentDetailPage />
            </TrainerProtectedRoute>
          }
        />
        <Route
          path="/students/new"
          element={
            <TrainerProtectedRoute>
              <StudentFormPage />
            </TrainerProtectedRoute>
          }
        />
        <Route
          path="/students/edit/:studentId"
          element={
            <TrainerProtectedRoute>
              <StudentFormPage />
            </TrainerProtectedRoute>
          }
        />
        <Route
          path="/students/manage"
          element={
            <TrainerProtectedRoute>
              <StudentsDirectoryPage />
            </TrainerProtectedRoute>
          }
        />
        <Route
          path="/courses/new"
          element={
            <TrainerProtectedRoute>
              <CourseFormPage />
            </TrainerProtectedRoute>
          }
        />
        <Route
          path="/courses/edit/:courseId"
          element={
            <TrainerProtectedRoute>
              <CourseFormPage />
            </TrainerProtectedRoute>
          }
        />
        <Route
          path="/courses/manage"
          element={
            <TrainerProtectedRoute>
              <CoursesDirectoryPage />
            </TrainerProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <DataProvider>
            <AppRoutes />
            <NotificationViewport />
          </DataProvider>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}
