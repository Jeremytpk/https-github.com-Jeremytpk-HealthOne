import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { Shield, Building2, Users, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export default function PrivacyPolicy() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"hospitals" | "patients">("hospitals");

  const enContent = {
    hospitalsTitle: "Hospitals & Facilities",
    hospitalsSubtitle: "Data privacy & infrastructure safeguards for clinics using HealthOne",
    patientsTitle: "Patients Info & Records",
    patientsSubtitle: "Confidentiality and protection of medical files & health records",
    hospitalsBody: [
      {
        title: "Complete Data Segregation",
        desc: "HealthOne enforces absolute multi-tenant barrier mechanisms. Each hospital's clinical and administrative databases are strictly isolated, ensuring no other entity or medical facility can ever query or access your operational registries."
      },
      {
        title: "Staff & Role-Based Control",
        desc: "Hospital directors manage local authorization rules. Read, write, or initialization capabilities over patient files are strictly restricted based on staff role mappings (Reception, Nurse, Doctor, Pharmacist, Cashier), preventing credential creep or privilege escalation."
      },
      {
        title: "Secure Infrastructure & Offline Sync",
        desc: "All administrative files, payroll registries, and inventory books are synchronized securely over high-grade HTTPS tunnels. Local storage on terminals is encrypted to protect data when working in offline modes."
      }
    ],
    patientsBody: [
      {
        title: "Protected Health Information (PHI)",
        desc: "Every record, including consultation histories, clinical diagnoses, evolution logs, and prescriptions is treated as highly sensitive data. Access is only authorized for healthcare practitioners directly assigned to the patient's active care plan."
      },
      {
        title: "Audit Logs & Direct Traceability",
        desc: "Every interaction with patient files is logged. Our system records who initiated, edited, or viewed a file, ensuring complete forensic accountability for patient record protection."
      },
      {
        title: "Local State Compliance",
        desc: "We process clinical records in tight compliance with international safety framework rules (HIPAA, GDPR, HDS). Personal identifiable details (PII) are separated structurally at rest from diagnostic metadata to elevate protective standards."
      }
    ]
  };

  const frContent = {
    hospitalsTitle: "Établissements & Hôpitaux",
    hospitalsSubtitle: "Protection des données & sécurité de l'infrastructure pour les cliniques",
    patientsTitle: "Données & Dossiers Patients",
    patientsSubtitle: "Sécurisation et confidentialité des dossiers de soins et d'évolution",
    hospitalsBody: [
      {
        title: "Ségrégation Absolue des Données",
        desc: "HealthOne applique un cloisonnement strict multi-entités. Les bases de données cliniques et administratives de chaque hôpital sont isolées de manière rigoureuse, garantissant qu'aucun autre établissement de santé ne puisse interroger ou consulter vos registres."
      },
      {
        title: "Contrôle d'Accès par Rôles",
        desc: "Les administrateurs d'hôpitaux gèrent les privilèges d'accès au niveau local. Les opérations de lecture, d'écriture ou d'initialisation sur les dossiers médicaux sont de facto liées au rôle attribué (Réception, Infirmier, Médecin, Pharmacien, Caisse) pour prévenir toute indiscrétion."
      },
      {
        title: "Synchronisation Sécurisée et Stockage Hors-Ligne",
        desc: "Tous les documents administratifs, listings de stocks et états comptables sont synchronisés via des certificats SSL/TLS haut de gamme. Les fichiers temporaires enregistrés localement sur vos terminaux lors du travail hors-ligne sont encryptés."
      }
    ],
    patientsBody: [
      {
        title: "Informations de Santé Protégées",
        desc: "Chaque dossier d'évolution, note de garde, ordonnance et donnée financière est classifié secret médical. Seul le personnel en charge active du patient possède des droits de consultation spécifiques."
      },
      {
        title: "Traçabilité & Journaux d'Audit",
        desc: "Une traçabilité infaillible est maintenue sur l'ensemble des fichiers patients. Le système enregistre précisément l'identité de l'agent ayant consulté ou modifié un dossier, ainsi que l'horodatage exact de l'opération."
      },
      {
        title: "Respect des Réglementations Nationales",
        desc: "Nous traitons les dossiers cliniques conformément à la législation sur la protection des données de santé (RGPD, HDS, HIPAA). Les informations personnelles identifiables sont stockées de façon asymétrique pour blinder la sécurité du dossier."
      }
    ]
  };

  const content = language === "fr" ? frContent : enContent;

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 p-4 sm:p-2">
      {/* Title block */}
      <div className="border-b border-slate-200 pb-4">
        <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.2em] mb-1">
          {language === "fr" ? "PORTAIL JURIDIQUE / CONFIDENTIALITÉ" : "LEGAL PORTAL / PRIVACY POLICY"}
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-tight text-slate-800 uppercase flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-600 inline-block" />
          {t("privacy")}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-1 max-w-lg">
        <button
          onClick={() => setActiveTab("hospitals")}
          className={`flex-1 py-2 px-4 rounded-md text-xs sm:text-sm font-bold uppercase transition-all flex items-center justify-center gap-2 ${
            activeTab === "hospitals"
              ? "bg-white text-blue-600 shadow-sm border border-slate-100"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4" />
          {content.hospitalsTitle}
        </button>
        <button
          onClick={() => setActiveTab("patients")}
          className={`flex-1 py-2 px-4 rounded-md text-xs sm:text-sm font-bold uppercase transition-all flex items-center justify-center gap-2 ${
            activeTab === "patients"
              ? "bg-white text-blue-600 shadow-sm border border-slate-100"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          {content.patientsTitle}
        </button>
      </div>

      {/* Content wrapper */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
            {activeTab === "hospitals" ? content.hospitalsTitle : content.patientsTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6 border-b border-slate-100 pb-4">
            {activeTab === "hospitals" ? content.hospitalsSubtitle : content.patientsSubtitle}
          </p>

          <div className="space-y-6">
            {(activeTab === "hospitals" ? content.hospitalsBody : content.patientsBody).map((item, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide font-mono">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="text-[10px] font-mono text-slate-500 text-center uppercase tracking-wider py-4 border-t border-slate-100">
        HealthOne Hospital Security Standard &bull; Updated June 2026
      </div>
    </div>
  );
}
