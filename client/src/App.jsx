import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Dashboard from './pages/Dashboard';
import ProjectNew from './pages/ProjectNew';
import ProjectEdit from './pages/ProjectEdit';
import ProjectBids from './pages/ProjectBids';
import MyProjects from './pages/MyProjects';
import MyBids from './pages/MyBids';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import Contracts from './pages/Contracts';
import ContractPage from './pages/ContractPage';
import ChatPage from './pages/ChatPage';
import ChatByContract from './pages/ChatByContract';
import { RealtimeProvider } from './context/RealtimeContext';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <RealtimeProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        <Route path="profile/:id" element={<Profile />} />

        {/* Pages that need a login */}
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings/profile" element={<ProfileEdit />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/:id" element={<ContractPage />} />
          <Route path="bids" element={<Navigate to="/my-bids" replace />} />
        </Route>

        {/* Clients only */}
        <Route element={<ProtectedRoute roles={['client']} />}>
          <Route path="projects/new" element={<ProjectNew />} />
          <Route path="projects/:id/edit" element={<ProjectEdit />} />
          <Route path="projects/:id/bids" element={<ProjectBids />} />
          <Route path="my-projects" element={<MyProjects />} />
        </Route>

        {/* Clients and freelancers: chat */}
        <Route element={<ProtectedRoute roles={['client', 'freelancer']} />}>
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/contract/:contractId" element={<ChatByContract />} />
          <Route path="chat/:id" element={<ChatPage />} />
        </Route>

        {/* Freelancers only */}
        <Route element={<ProtectedRoute roles={['freelancer']} />}>
          <Route path="my-bids" element={<MyBids />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </RealtimeProvider>
  );
}
