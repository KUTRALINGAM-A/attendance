import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import your components
import FlamingoLogin from './pages/auth/login';
import FlamingoRegister from './pages/auth/register';
import FlamingoPass from './pages/auth/Password'
import Flamingodashboard from './pages/dashboard/Dashboard'
import Flamingoatt from './pages/dashboard/cal'
import Flamingoreport from './pages/dashboard/reports'
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default route redirects to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Authentication routes */}
          <Route path="/login" element={<FlamingoLogin />} />
          <Route path="/register" element={<FlamingoRegister />} />
          <Route path="/Password" element={<FlamingoPass />} />
          <Route path="/Dashboard" element={<Flamingodashboard />} />
          <Route path="/cal" element={<Flamingoatt />} />
          <Route path="/reports" element={<Flamingoreport/>} />
          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;