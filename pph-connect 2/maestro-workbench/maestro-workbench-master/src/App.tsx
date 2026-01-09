import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Header from "@/components/layout/Header";
import ManagerLayout from "@/components/layout/ManagerLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";
import { hasRole } from "@/lib/auth/roles";
import LiveChatWidget from "@/components/support/LiveChatWidget";

const queryClient = new QueryClient();

const Landing = React.lazy(() => import("./pages/Landing"));
const AdminSetup = React.lazy(() => import("./pages/admin/Setup"));
const ManagerDashboard = React.lazy(() => import("./pages/manager/Dashboard"));
const ProjectsPage = React.lazy(() => import("./pages/manager/ProjectsPage"));
const ProjectListingsPage = React.lazy(() => import("./pages/manager/ProjectListingsPage"));
const CreateProjectListingPage = React.lazy(() => import("./pages/manager/CreateProjectListingPage"));
const QualityDashboard = React.lazy(() => import("./pages/manager/QualityDashboard"));
const TeamsPage = React.lazy(() => import("./pages/manager/TeamsPage"));
const ProjectDetail = React.lazy(() => import("./pages/manager/ProjectDetail"));
const GoldStandardsPage = React.lazy(() => import("./pages/manager/GoldStandardsPage"));
const ProjectApplicationsPage = React.lazy(() => import("./pages/manager/ProjectApplicationsPage"));
const TeamDetail = React.lazy(() => import("./pages/manager/TeamDetail"));
const DepartmentsPage = React.lazy(() => import("./pages/manager/DepartmentsPage"));
const UserManagement = React.lazy(() => import("./pages/manager/UserManagement"));
const UserManagementPage = React.lazy(() => import("./pages/manager/UserManagementPage"));
const ProjectAssignment = React.lazy(() => import("./pages/manager/ProjectAssignment"));
const NewProject = React.lazy(() => import("./pages/manager/NewProject"));
const PluginManager = React.lazy(() => import("./pages/manager/PluginManager"));
const NewPlugin = React.lazy(() => import("./pages/manager/NewPlugin"));
const StatsPage = React.lazy(() => import("./pages/manager/StatsPage"));
const ManagerAnalyticsPage = React.lazy(() => import("./pages/manager/ManagerAnalyticsPage"));
const ReportsPage = React.lazy(() => import("./pages/manager/ReportsPage"));
const RateCardsPage = React.lazy(() => import("./pages/manager/RateCardsPage"));
const AssessmentsPage = React.lazy(() => import("./pages/manager/AssessmentsPage"));
const InvoiceManagementPage = React.lazy(() => import("./pages/manager/InvoiceManagementPage"));
const InvoicePreviewPage = React.lazy(() => import("./pages/manager/InvoicePreviewPage"));
const Questions = React.lazy(() => import("./pages/manager/Questions"));
const PasteLogs = React.lazy(() => import("./pages/manager/PasteLogs"));
const ClientLogs = React.lazy(() => import("./pages/manager/ClientLogs"));
const TrainingModules = React.lazy(() => import("./pages/manager/TrainingModules"));
const WorkerDetail = React.lazy(() => import("./pages/manager/WorkerDetail"));
const WorkerDashboard = React.lazy(() => import("./pages/worker/Dashboard"));
const WorkerProfilePage = React.lazy(() => import("./pages/worker/Profile"));
const WorkerSkillTreePage = React.lazy(() => import("./pages/worker/SkillTree"));
const WorkerForumPage = React.lazy(() => import("./pages/worker/Forum"));
const CommunityForumPage = React.lazy(() => import("./pages/community/Forum"));
const WorkerLeaderboardPage = React.lazy(() => import("./pages/worker/Leaderboard"));
const WorkerNotificationsPage = React.lazy(() => import("./pages/worker/Notifications"));
const WorkerKnowledgeBasePage = React.lazy(() => import("./pages/worker/KnowledgeBase"));
const WorkerSelfServiceSupportPage = React.lazy(() => import("./pages/worker/SelfServiceSupport"));
const WorkerSupportTicketsPage = React.lazy(() => import("./pages/worker/SupportTickets"));
const WorkerExitSurveyPage = React.lazy(() => import("./pages/worker/ExitSurveyPage"));
const WorkerOnboardingPage = React.lazy(() => import("./pages/worker/OnboardingPage"));
const ManagerKnowledgeBaseAdminPage = React.lazy(() => import("./pages/manager/KnowledgeBaseAdmin"));
const ManagerSupportTicketManagementPage = React.lazy(() => import("./pages/manager/SupportTicketManagement"));
const WorkerTrainingPage = React.lazy(() => import("./pages/worker/Training"));
const WorkerEarningsPage = React.lazy(() => import("./pages/worker/Earnings"));
const AvailableProjectsPage = React.lazy(() => import("./pages/worker/AvailableProjectsPage"));
const MyApplicationsPage = React.lazy(() => import("./pages/worker/MyApplicationsPage"));
const WorkerWorkbench = React.lazy(() => import("./pages/worker/Workbench"));
const WorkerAnalytics = React.lazy(() => import("./pages/worker/Analytics"));
const WorkerAssessmentsPage = React.lazy(() => import("./pages/worker/Assessments"));
const WorkerAssignmentsPage = React.lazy(() => import("./pages/worker/Assignments"));
const WorkerAppealsPage = React.lazy(() => import("./pages/worker/AppealsPage"));
const WorkerInterviewPage = React.lazy(() => import("./pages/worker/InterviewPage"));
const InterviewReviewPage = React.lazy(() => import("./pages/manager/InterviewReviewPage"));
const ManagerAppealsReviewPage = React.lazy(() => import("./pages/manager/AppealsReviewPage"));
const MessagesInbox = React.lazy(() => import("./pages/messages/Inbox"));
const MessagesCompose = React.lazy(() => import("./pages/messages/Compose"));
const MessagesThread = React.lazy(() => import("./pages/messages/Thread"));
const MessagesBroadcast = React.lazy(() => import("./pages/messages/Broadcast"));
const GroupConversation = React.lazy(() => import("./pages/messages/GroupConversation"));
const GroupInfo = React.lazy(() => import("./pages/messages/GroupInfo"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const ChangePassword = React.lazy(() => import("./pages/ChangePassword"));
const TestDriveAccess = React.lazy(() => import("./pages/TestDriveAccess"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const AnonymousHotlinePage = React.lazy(() => import("./pages/AnonymousHotline"));
const AdminHotlineManagementPage = React.lazy(() => import("./pages/admin/HotlineManagement"));
const AdminApplicationsPage = React.lazy(() => import("./pages/admin/ApplicationsPage"));
const AdminAutoRemovalsPage = React.lazy(() => import("./pages/admin/AutoRemovalsPage"));
const PublicApplicationPage = React.lazy(() => import("./pages/PublicApplicationPage"));

const RouteFallback: React.FC = () => (
  <div className="flex min-h-[40vh] items-center justify-center bg-background">
    <div className="text-center">
      <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      <p className="mt-4 text-sm text-muted-foreground">Loading module…</p>
    </div>
  </div>
);

const PluginEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/m/plugins/edit/${id}`} replace />;
};

const TemplateEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/m/templates/edit/${id}`} replace />;
};

const AppRoutes = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const isManager = hasRole(user?.role ?? null, 'manager');

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          isAuthenticated ? <Navigate to={isManager ? "/m/dashboard" : "/w/dashboard"} replace /> : <Landing />
        } />
        <Route path="/auth" element={
          isAuthenticated ? <Navigate to={isManager ? "/m/dashboard" : "/w/dashboard"} replace /> : <Landing />
        } />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/apply" element={<PublicApplicationPage />} />
        <Route path="/report" element={<AnonymousHotlinePage />} />
        <Route path="/w" element={
          isAuthenticated ? <Navigate to="/w/dashboard" replace /> : <Navigate to="/?role=worker" replace />
        } />
        <Route path="/m" element={
          isAuthenticated ? <Navigate to="/m/dashboard" replace /> : <Navigate to="/?role=manager" replace />
        } />
        <Route path="/admin/setup" element={<AdminSetup />} />
        
        {/* Manager Routes (/m/*) */}
        <Route path="/m/dashboard" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Dashboard">
              <ManagerDashboard />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/projects" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Project Overview">
              <ProjectsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/project-listings" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Project Listings">
              <ProjectListingsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/project-listings/new" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="New Project Listing">
              <CreateProjectListingPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/assessments" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Assessments">
              <AssessmentsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/quality" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Quality Overview">
              <QualityDashboard />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/projects/:projectId/gold-standards" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Gold Standards" breadcrumbs={[{ label: "Projects", href: "/m/projects" }, { label: "Gold Standards", current: true }]}>
              <GoldStandardsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/appeals" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Appeals Review">
              <ManagerAppealsReviewPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/departments" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout
              pageTitle="Departments"
              breadcrumbs={[{ label: "Departments", current: true }]}
            >
              <DepartmentsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/teams" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout
              pageTitle="Teams"
              breadcrumbs={[{ label: "Teams", current: true }]}
            >
              <TeamsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/teams/:id" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout
              pageTitle="Team Detail"
              breadcrumbs={[
                { label: "Teams", href: "/m/teams" },
                { label: "Team Detail", current: true }
              ]}
            >
              <TeamDetail />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/projects/:id" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout
              pageTitle="Project Detail"
              breadcrumbs={[
                { label: "Projects", href: "/m/projects" },
                { label: "Project Detail", current: true }
              ]}
            >
              <ProjectDetail />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/manager/interviews/:id" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout
              pageTitle="Interview Review"
              breadcrumbs={[
                { label: "Interviews", href: "/m/projects" },
                { label: "Review", current: true }
              ]}
            >
              <InterviewReviewPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/projects/:id/applications" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout
              pageTitle="Project Applications"
              breadcrumbs={[
                { label: "Projects", href: "/m/projects" },
                { label: "Applications", current: true }
              ]}
            >
              <ProjectApplicationsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/projects/new" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="New Project">
              <NewProject />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/projects/questions/:projectId" element={
          <ProtectedRoute requiredRole="manager">
            <>
              <Header />
              <main className="flex-1 overflow-y-auto px-6 py-6">
                <Questions />
              </main>
            </>
          </ProtectedRoute>
        } />
        <Route path="/invoices" element={
          <ProtectedRoute requiredRole="manager">
            <InvoiceManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/invoices/:id/preview" element={
          <ProtectedRoute requiredRole="manager">
            <InvoicePreviewPage />
          </ProtectedRoute>
        } />
        <Route path="/m/users" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="User Management">
              <UserManagement />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/assignments" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Project Assignments">
              <ProjectAssignment />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/plugins" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Plugin Manager">
              <PluginManager />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/plugins/new" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="New Plugin">
              <NewPlugin />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/plugins/edit/:id" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Edit Plugin">
              <NewPlugin />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/templates" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Templates">
              <PluginManager />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/templates/new" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="New Template">
              <NewPlugin />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/templates/edit/:id" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Edit Template">
              <NewPlugin />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/analytics" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Analytics">
              <ManagerAnalyticsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/reports" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Reports">
              <ReportsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/stats/import" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Stats Import">
              <StatsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/training-modules" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Training Modules">
              <TrainingModules />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/knowledge-base" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Knowledge Base Admin">
              <ManagerKnowledgeBaseAdminPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/manager/tickets" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerSupportTicketManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/applications" element={
          <ProtectedRoute requiredRole="admin">
            <AdminApplicationsPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute requiredRole="admin">
            <AdminHotlineManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/auto-removals" element={
          <ProtectedRoute requiredRole="admin">
            <AdminAutoRemovalsPage />
          </ProtectedRoute>
        } />
        <Route path="/m/rate-cards" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Rate Cards">
              <RateCardsPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/paste-logs" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Paste Logs">
              <PasteLogs />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/client-logs" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Client Logs">
              <ClientLogs />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/messages/inbox" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Messages">
              <MessagesInbox />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/messages/compose" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Compose Message">
              <MessagesCompose />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/messages/thread/:threadId" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Message Thread">
              <MessagesThread />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/messages/broadcast" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Broadcast Message">
              <MessagesBroadcast />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/messages/group/:groupId" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Group Conversation">
              <GroupConversation />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/messages/group/:groupId/info" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Group Info">
              <GroupInfo />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/m/workers/:id" element={
          <ProtectedRoute requiredRole="manager">
            <ManagerLayout pageTitle="Worker Detail">
              <WorkerDetail />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/test-drive" element={
          <ProtectedRoute requiredRole="manager">
            <TestDriveAccess />
          </ProtectedRoute>
        } />

        {/* Worker Routes (/w/*) */}
        <Route path="/w/dashboard" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/w/profile" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/w/skill-tree" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerSkillTreePage />
          </ProtectedRoute>
        } />
        <Route path="/w/forum" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerForumPage />
          </ProtectedRoute>
        } />
        <Route path="/w/leaderboard" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerLeaderboardPage />
          </ProtectedRoute>
        } />
        <Route path="/w/training" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerTrainingPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/training" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerTrainingPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/onboarding" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerOnboardingPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/profile" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/worker/skill-tree" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerSkillTreePage />
          </ProtectedRoute>
        } />
        <Route path="/worker/forum" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerForumPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/leaderboard" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerLeaderboardPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/notifications" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerNotificationsPage />
          </ProtectedRoute>
        } />
        <Route path="/support" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerSelfServiceSupportPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/exit-survey" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerExitSurveyPage />
          </ProtectedRoute>
        } />
        <Route path="/support/tickets" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerSupportTicketsPage />
          </ProtectedRoute>
        } />
        <Route path="/help" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerKnowledgeBasePage />
          </ProtectedRoute>
        } />
        <Route path="/community" element={
          <ProtectedRoute requiredRole="worker">
            <CommunityForumPage />
          </ProtectedRoute>
        } />
        <Route path="/w/earnings" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerEarningsPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/earnings" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerEarningsPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/projects/available" element={
          <ProtectedRoute requiredRole="worker">
            <AvailableProjectsPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/interview/:domain" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerInterviewPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/applications" element={
          <ProtectedRoute requiredRole="worker">
            <MyApplicationsPage />
          </ProtectedRoute>
        } />
        <Route path="/w/applications" element={
          <ProtectedRoute requiredRole="worker">
            <MyApplicationsPage />
          </ProtectedRoute>
        } />
        <Route path="/w/assignments" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerAssignmentsPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/assignments" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerAssignmentsPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/appeals" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerAppealsPage />
          </ProtectedRoute>
        } />
        <Route path="/worker/dashboard" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/w/workbench" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerWorkbench />
          </ProtectedRoute>
        } />
        <Route path="/w/analytics" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerAnalytics />
          </ProtectedRoute>
        } />
        <Route path="/w/assessments" element={
          <ProtectedRoute requiredRole="worker">
            <WorkerAssessmentsPage />
          </ProtectedRoute>
        } />
        <Route path="/w/messages/inbox" element={
          <ProtectedRoute requiredRole="worker">
            <>
              <Header />
              <main className="flex-1 overflow-y-auto px-6 py-6">
                <MessagesInbox />
              </main>
            </>
          </ProtectedRoute>
        } />
        <Route path="/w/messages/compose" element={
          <ProtectedRoute requiredRole="worker">
            <>
              <Header />
              <main className="flex-1 overflow-y-auto px-6 py-6">
                <MessagesCompose />
              </main>
            </>
          </ProtectedRoute>
        } />
        <Route path="/w/messages/group/:groupId" element={
          <ProtectedRoute requiredRole="worker">
            <>
              <Header />
              <div className="container mx-auto py-6">
                <GroupConversation />
              </div>
            </>
          </ProtectedRoute>
        } />
        <Route path="/w/messages/group/:groupId/info" element={
          <ProtectedRoute requiredRole="worker">
            <>
              <Header />
              <div className="container mx-auto py-6">
                <GroupInfo />
              </div>
            </>
          </ProtectedRoute>
        } />
        <Route path="/w/messages/thread/:threadId" element={
          <ProtectedRoute requiredRole="worker">
            <>
              <Header />
              <main className="flex-1 overflow-y-auto px-6 py-6">
                <MessagesThread />
              </main>
            </>
          </ProtectedRoute>
        } />

        {/* Shared Routes */}
        <Route path="/change-password" element={
          <ProtectedRoute>
            <>
              <main className="flex-1 overflow-y-auto px-6 py-6">
                <ChangePassword />
              </main>
            </>
          </ProtectedRoute>
        } />

        {/* Legacy Redirects to prevent 404s */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {isManager ? (
              <Navigate to="/m/dashboard" replace />
            ) : (
              <Navigate to="/w/dashboard" replace />
            )}
          </ProtectedRoute>
        } />
        <Route path="/manager" element={<Navigate to="/m/dashboard" replace />} />
        <Route path="/users" element={
          <ProtectedRoute requiredRole="admin">
            <ManagerLayout pageTitle="User Management" breadcrumbs={[{ label: "User Management", current: true }]}>
              <UserManagementPage />
            </ManagerLayout>
          </ProtectedRoute>
        } />
        <Route path="/manager/users" element={<Navigate to="/m/users" replace />} />
        <Route path="/manager/assignments" element={<Navigate to="/m/assignments" replace />} />
        <Route path="/manager/paste-logs" element={<Navigate to="/m/paste-logs" replace />} />
        <Route path="/new-project" element={<Navigate to="/m/projects/new" replace />} />
        <Route path="/plugins" element={<Navigate to="/m/plugins" replace />} />
        <Route path="/plugins/new" element={<Navigate to="/m/plugins/new" replace />} />
        <Route path="/plugins/edit/:id" element={<PluginEditRedirect />} />
        <Route path="/templates" element={<Navigate to="/m/templates" replace />} />
        <Route path="/templates/new" element={<Navigate to="/m/templates/new" replace />} />
        <Route path="/templates/edit/:id" element={<TemplateEditRedirect />} />
        <Route path="/stats" element={<Navigate to="/m/analytics" replace />} />
        <Route path="/questions/:projectId" element={<Navigate to="/m/projects/questions/:projectId" replace />} />
        <Route path="/workbench" element={<Navigate to="/w/workbench" replace />} />
        <Route path="/analytics" element={
          <ProtectedRoute>
            {isManager ? (
              <Navigate to="/m/analytics" replace />
            ) : (
              <Navigate to="/w/analytics" replace />
            )}
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
        </Routes>
        {isAuthenticated && <LiveChatWidget />}
      </Suspense>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <AppErrorBoundary>
            <AppRoutes />
          </AppErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
      <SpeedInsights />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
