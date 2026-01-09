import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { WorkerList } from '@/pages/workers/WorkerList'
import { WorkerCreate } from '@/pages/workers/WorkerCreate'
import { WorkerEdit } from '@/pages/workers/WorkerEdit'
import { WorkerDetail } from '@/pages/workers/WorkerDetail'
import { ProjectList } from '@/pages/projects/ProjectList'
import { ProjectCreate } from '@/pages/projects/ProjectCreate'
import { ProjectEdit } from '@/pages/projects/ProjectEdit'
import { ProjectDetail } from '@/pages/projects/ProjectDetail'
import { TeamList } from '@/pages/teams/TeamList'
import { TeamCreate } from '@/pages/teams/TeamCreate'
import { TeamEdit } from '@/pages/teams/TeamEdit'
import { TeamDetail } from '@/pages/teams/TeamDetail'
import { DepartmentList } from '@/pages/departments/DepartmentList'
import { DepartmentCreate } from '@/pages/departments/DepartmentCreate'
import { DepartmentEdit } from '@/pages/departments/DepartmentEdit'
import WorkStatsImport from '@/pages/stats/WorkStatsImport'
import { StatsPage } from '@/pages/stats/StatsPage'
import RateCardsPage from '@/pages/rates/RateCardsPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Dashboard">
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workers"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Workers">
              <WorkerList />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workers/create"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Create Worker">
              <WorkerCreate />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workers/:id"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Worker Details">
              <WorkerDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workers/:id/edit"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Edit Worker">
              <WorkerEdit />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Projects">
              <ProjectList />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/create"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Create Project">
              <ProjectCreate />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Project Details">
              <ProjectDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id/edit"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Edit Project">
              <ProjectEdit />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Teams">
              <TeamList />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/create"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Create Team">
              <TeamCreate />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:id"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Team Details">
              <TeamDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:id/edit"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Edit Team">
              <TeamEdit />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Departments">
              <DepartmentList />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments/create"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Create Department">
              <DepartmentCreate />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments/:id/edit"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Edit Department">
              <DepartmentEdit />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stats"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Work Stats">
              <StatsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stats/import"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Work Stats Import">
              <WorkStatsImport />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rates"
        element={
          <ProtectedRoute>
            <AppLayout pageTitle="Rate Cards">
              <RateCardsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
  )
}

export default App
