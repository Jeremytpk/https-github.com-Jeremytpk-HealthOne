import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { OfflineSyncProvider } from "./contexts/OfflineSyncContext";
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
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && profile) {
    const userRole = getNormalizedRole(profile.role);
    // System Admin and Super Admin can bypass check and access all screens
    if (userRole === "SYSTEM_ADMIN" || userRole === "SUP_ADMIN") {
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
        <OfflineSyncProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                
                <Route path="patients" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'REGISTER', 'CASHIER']}>
                    <PatientListing />
                  </ProtectedRoute>
                } />
                
                <Route path="patients/:id" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'REGISTER', 'CASHIER']}>
                    <PatientDetails />
                  </ProtectedRoute>
                } />
                
                <Route path="staff" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
                    <StaffManagement />
                  </ProtectedRoute>
                } />
                
                <Route path="inventory" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST', 'PHARMACIE', 'INVENTAIRE', 'INVENTORY']}>
                    <Inventory />
                  </ProtectedRoute>
                } />
                
                <Route path="pharmacy" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST', 'PHARMACIE', 'DOCTOR']}>
                    <Pharmacy />
                  </ProtectedRoute>
                } />
                
                <Route path="finance" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'REGISTER']}>
                    <Finance />
                  </ProtectedRoute>
                } />
                
                <Route path="profile" element={<Profile />} />
                <Route path="system-admin" element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'SUP_ADMIN']}><SystemAdmin /></ProtectedRoute>} />
                <Route path="privacy" element={<PrivacyPolicy />} />
                <Route path="terms" element={<TermsAndConditions />} />
              </Route>

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AuthProvider>
        </OfflineSyncProvider>
      </LanguageProvider>
    </Router>
  );
}
