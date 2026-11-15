import { Route, Routes } from 'react-router-dom';
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
import NotFound from './pages/NotFound';

export default function App() {
  return (
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
        </Route>

        {/* Clients only */}
        <Route element={<ProtectedRoute roles={['client']} />}>
          <Route path="projects/new" element={<ProjectNew />} />
          <Route path="projects/:id/edit" element={<ProjectEdit />} />
          <Route path="projects/:id/bids" element={<ProjectBids />} />
          <Route path="my-projects" element={<MyProjects />} />
        </Route>

        {/* Freelancers only */}
        <Route element={<ProtectedRoute roles={['freelancer']} />}>
          <Route path="my-bids" element={<MyBids />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
