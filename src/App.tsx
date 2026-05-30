import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Layout from "./components/Layout";
import { getNormalizedRole } from "./lib/utils";
import LoadingPage from "./components/LoadingPage";

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
import Profile from "./pages/Profile";

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && profile) {
    const userRole = getNormalizedRole(profile.role);
    // Admin, System Admin and SupAdmin can bypass and access all screens
    if (userRole === "ADMIN" || userRole === "SYSTEM_ADMIN" || userRole === "SUP_ADMIN") {
      return <>{children}</>;
    }
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
              
              <Route path="patients" element={
                <ProtectedRoute allowedRoles={['DOCTOR', 'NURSE', 'RECEPTIONIST', 'REGISTER', 'CASHIER']}>
                  <PatientListing />
                </ProtectedRoute>
              } />
              
              <Route path="patients/:id" element={
                <ProtectedRoute allowedRoles={['DOCTOR', 'NURSE', 'RECEPTIONIST', 'REGISTER', 'CASHIER']}>
                  <PatientDetails />
                </ProtectedRoute>
              } />
              
              <Route path="staff" element={
                <ProtectedRoute allowedRoles={['HR']}>
                  <StaffManagement />
                </ProtectedRoute>
              } />
              
              <Route path="inventory" element={
                <ProtectedRoute allowedRoles={['PHARMACIST']}>
                  <Inventory />
                </ProtectedRoute>
              } />
              
              <Route path="pharmacy" element={
                <ProtectedRoute allowedRoles={['PHARMACIST', 'DOCTOR']}>
                  <Pharmacy />
                </ProtectedRoute>
              } />
              
              <Route path="finance" element={
                <ProtectedRoute allowedRoles={['CASHIER']}>
                  <Finance />
                </ProtectedRoute>
              } />
              
              <Route path="profile" element={<Profile />} />
              <Route path="system-admin" element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'SUP_ADMIN']}><SystemAdmin /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}
