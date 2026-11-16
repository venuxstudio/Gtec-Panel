/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { BranchDetailPage } from './pages/BranchDetailPage';
import { BranchesPage } from './pages/BranchesPage';
import { CourseFormPage } from './pages/CourseFormPage';
import { CoursesDirectoryPage } from './pages/CoursesDirectoryPage';
import { LoginPage } from './pages/LoginPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { StudentFormPage } from './pages/StudentFormPage';
import { StudentsDirectoryPage } from './pages/StudentsDirectoryPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, authReady, isLocked, hasPinConfigured } = useAuth();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090B0E]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
      </div>
    );
  }

  if (!user || (isLocked && hasPinConfigured)) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, authReady, isLocked, hasPinConfigured } = useAuth();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090B0E]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
      </div>
    );
  }

  if (user && !(isLocked && hasPinConfigured)) {
    return <Navigate to="/branches" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/branches"
        element={
          <ProtectedRoute>
            <BranchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/branch/:branchId"
        element={
          <ProtectedRoute>
            <BranchDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/:studentId"
        element={
          <ProtectedRoute>
            <StudentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/new"
        element={
          <ProtectedRoute>
            <StudentFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/edit/:studentId"
        element={
          <ProtectedRoute>
            <StudentFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/manage"
        element={
          <ProtectedRoute>
            <StudentsDirectoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/new"
        element={
          <ProtectedRoute>
            <CourseFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/edit/:courseId"
        element={
          <ProtectedRoute>
            <CourseFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/manage"
        element={
          <ProtectedRoute>
            <CoursesDirectoryPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/branches" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
