import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Layout from "./components/Layout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PatientListing from "./pages/PatientListing";
import PatientDetails from "./pages/PatientDetails";
import StaffManagement from "./pages/StaffManagement";
import Inventory from "./pages/Inventory";
import Pharmacy from "./pages/Pharmacy";
import Finance from "./pages/Finance";
import SystemAdmin from "./pages/SystemAdmin";

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && profile) {
    const userRole = profile.role?.toUpperCase();
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" />;
    }
  }
  
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="patients" element={<PatientListing />} />
              <Route path="patients/:id" element={<PatientDetails />} />
              <Route path="staff" element={<StaffManagement />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="pharmacy" element={<Pharmacy />} />
              <Route path="finance" element={<Finance />} />
              <Route path="system-admin" element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}><SystemAdmin /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}
