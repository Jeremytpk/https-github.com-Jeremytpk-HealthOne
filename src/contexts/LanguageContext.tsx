import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "fr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    patients: "Patients",
    staff: "Staff",
    inventory: "Inventory",
    pharmacy: "Pharmacy",
    finance: "Finance",
    settings: "Settings",
    login: "Login",
    logout: "Logout",
    registerPatient: "Register Patient",
    staffManagement: "Staff Management",
    history: "History",
    evolution: "Evolution",
    status: "Status",
    active: "Active",
    vacation: "On Vacation",
    off: "Off",
    terminated: "Terminated",
    hospitalName: "Hospital Name",
    patientName: "Patient Name",
    save: "Save",
    cancel: "Cancel",
    search: "Search",
    newCase: "New Case",
    role: "Role",
    admin: "Admin",
    doctor: "Doctor",
    nurse: "Nurse",
    cashier: "Cashier",
    pharmacist: "Pharmacist",
    hr: "HR",
    receptionist: "Receptionist",
    systemAdmin: "System Admin",
    revenue: "Revenue",
    occupancy: "Bed Occupancy",
    leave: "Staff on Leave",
    reorders: "Pharmacy Re-orders",
    tracking: "Patient Live Tracking",
    wait: "Wait Time",
    assignedDr: "Assigned Dr.",
    stage: "Stage",
    inventoryStatus: "Inventory Status",
    schedules: "Staff Schedules",
    amount: "Amount",
    method: "Method",
    timestamp: "Timestamp",
    billing: "Billing & Finance",
    provisioning: "Tenant Provisioning",
    email: "Email Address",
    password: "Password",
    loginPersonnel: "Personnel Authorization",
    accessKey: "Access Key",
    initAccess: "Initialize Access",
    adminPortal: "Administrator Access Portal",
    backToStaff: "Back to Staff Login",
    professionalSolution: "Professional Hospital Management Solution",
    adminPersonnel: "Administrator ID",
    adminKey: "Root Access Key",
    adminLogin: "Login to Root",
    notAuthorizedAdmin: "Access Denied: This portal is reserved for administrators."
  },
  fr: {
    dashboard: "Tableau de Bord",
    patients: "Patients",
    staff: "Personnel",
    inventory: "Inventaire",
    pharmacy: "Pharmacie",
    finance: "Finance",
    settings: "Paramètres",
    login: "Connexion",
    logout: "Déconnexion",
    registerPatient: "Enregistrer Patient",
    staffManagement: "Gestion du Personnel",
    history: "Historique",
    evolution: "Évolution",
    status: "Statut",
    active: "Actif",
    vacation: "En Vacances",
    off: "Absent",
    terminated: "Terminé",
    hospitalName: "Nom de l'Hôpital",
    patientName: "Nom du Patient",
    save: "Enregistrer",
    cancel: "Annuler",
    search: "Rechercher",
    newCase: "Nouveau Cas",
    role: "Rôle",
    admin: "Admin",
    doctor: "Médecin",
     nurse: "Infirmier(ère)",
    cashier: "Caissier",
    pharmacist: "Pharmacien",
    hr: "RH",
    receptionist: "Réceptionniste",
    systemAdmin: "Admin Système",
    revenue: "Revenu",
    occupancy: "Occupation des lits",
    leave: "Congés du personnel",
    reorders: "Réapprovisionnements",
    tracking: "Suivi des Patients",
    wait: "Temps d'attente",
    assignedDr: "Médecin assigné",
    stage: "Étape",
    inventoryStatus: "État de l'inventaire",
    schedules: "Horaires du Personnel",
    amount: "Montant",
    method: "Méthode",
    timestamp: "Horodatage",
    billing: "Facturation & Finance",
    provisioning: "Approvisionnement du Tenant",
    email: "Adresse Email",
    password: "Mot de passe",
    loginPersonnel: "Autorisation du Personnel",
    accessKey: "Clé d'Accès",
    initAccess: "Initialiser l'Accès",
    adminPortal: "Portail d'Accès Administrateur",
    backToStaff: "Retour à l'accès personnel",
    professionalSolution: "Solution Hospitalière de Pointe",
    adminPersonnel: "ID Administrateur",
    adminKey: "Clé d'Accès Racine",
    adminLogin: "Connexion Racine",
    notAuthorizedAdmin: "Accès Refusé : Ce portail est réservé aux administrateurs."
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("lang") as Language) || "en";
  });

  useEffect(() => {
    localStorage.setItem("lang", language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
