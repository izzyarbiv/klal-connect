import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import UpdatePrompt from '@/components/UpdatePrompt';
import InstallPrompt from '@/components/InstallPrompt';
import AppLayout from '@/components/AppLayout';
import Home from '@/pages/Home';
import Browse from '@/pages/Browse';
import ProviderDetail from '@/pages/ProviderDetail';
import Saved from '@/pages/Saved';
import AddListing from '@/pages/AddListing';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import Feed from '@/pages/Feed';
import Directory from '@/pages/Directory';
import People from '@/pages/People';
import PublicProfile from '@/pages/PublicProfile';
import CreateCompany from '@/pages/CreateCompany';
import CompanyPage from '@/pages/CompanyPage';
import Companies from '@/pages/Companies';
import Messages from '@/pages/Messages';
import Conversation from '@/pages/Conversation';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/people" element={<People />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Conversation />} />
        <Route path="/profile/:id" element={<PublicProfile />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/company/:slug" element={<CompanyPage />} />
        <Route path="/create-company" element={<CreateCompany />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/provider/:slug" element={<ProviderDetail />} />
        <Route path="/gemach/:slug" element={<ProviderDetail />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/add" element={<AddListing />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <UpdatePrompt />
        <InstallPrompt />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App