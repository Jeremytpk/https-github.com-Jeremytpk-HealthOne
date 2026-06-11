import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { FileText, Clock, HelpCircle, ShieldAlert, CheckSquare } from "lucide-react";

export default function TermsAndConditions() {
  const { t, language } = useLanguage();

  const enTerms = {
    title: "Terms and Conditions",
    metaTitle: "LEGAL AGREEMENT & HOSPITAL COMPLIANCE",
    alertTitle: "CRITICAL ACCOUNT VERIFICATION POLICY",
    alertBody: "To maintain maximum clinical safety and guarantee absolute patient file protection, HealthOne operates a verified onboarding framework. Every new account generated within your facility receives manual vetting. The compliance audit is completed and real system access is enabled between 20 minutes and 48 hours.",
    sections: [
      {
        title: "1. Professional Access Restrictions",
        body: "HealthOne tools and patient files are restricted strictly to registered medical practitioners and certified clerical staff. Sharing account credentials, allowing secondary sign-ins, or delegating administrative roles to unverified personnel constitutes a breach of healthcare security protocols."
      },
      {
        title: "2. Data Responsibility & Accountability",
        body: "When clinical notes are edited, dossiers created, or financial workflows finalized, the records are signed under your user ID. You are fully accountable for all entries. Deletion of diagnostic reports or logs is permanently prohibited to uphold public health traceability mandates."
      },
      {
        title: "3. Service Availability and Local Syncing",
        body: "Our system integrates powerful offline buffers to maintain operability. While offline storage secures the records locally, you must sync your local pending records with the cloud systematically to guarantee data integrity across all local hospital clinics."
      }
    ]
  };

  const frTerms = {
    title: "Conditions Générales",
    metaTitle: "ACCORD JURIDIQUE & CONFORMITÉ HOSPITALIÈRE",
    alertTitle: "POLITIQUE IMPORTANTE DE VÉRIFICATION DES COMPTES",
    alertBody: "Pour préserver la sécurité clinique et garantir une protection absolue des fiches patients, HealthOne applique un protocole d'activation vérifié. Chaque nouveau compte créé au sein de votre établissement fait l'objet d'un audit de sécurité. Le traitement et l'octroi d'accès effectif sont finalisés sous un délai garanti allant de 20 minutes à 48 heures.",
    sections: [
      {
        title: "1. Restriction d'Accès Professionnel",
        body: "Les outils HealthOne et les informations médicales sont strictement réservés aux praticiens de santé enregistrés et aux personnels administratifs certifiés. Prêter ses identifiants de connexion, autoriser des ouvertures de session secondaires ou déléguer des fonctions à des tiers est considéré comme une faute grave de sécurité."
      },
      {
        title: "2. Responsabilité Personnelle des Saisies",
        body: "Lorsqu'une note clinique est rédigée, un dossier ouvert ou une transaction comptabilisée, les opérations sont définitivement signées sous votre nom d'utilisateur. Vous êtes pleinement garant de l'exactitude de ces données. La suppression brute de données médicales est interdite afin de respecter l'obligation de traçabilité légale."
      },
      {
        title: "3. Disponibilité du Service & Synchronisation Local/Cloud",
        body: "L'application possède des modules de sauvegarde hors-ligne. Bien que les dossiers soient conservés en local de manière cryptée, il est obligatoire d'initier la synchronisation de vos dossiers en attente dès que la connexion réseau est établie pour assurer la cohérence de l'information."
      }
    ]
  };

  const terms = language === "fr" ? frTerms : enTerms;

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 p-4 sm:p-2">
      {/* Title block */}
      <div className="border-b border-slate-200 pb-4">
        <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.2em] mb-1">
          {terms.metaTitle}
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-tight text-slate-800 uppercase flex items-center gap-2">
          <FileText className="w-8 h-8 text-indigo-600 inline-block" />
          {terms.title}
        </h1>
      </div>

      {/* Verification Notice Banner - Alert style */}
      <div className="border border-amber-200 bg-amber-50/50 p-6 rounded-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Clock className="w-5 h-5 animate-spin duration-3500" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-800 font-mono">
              {terms.alertTitle}
            </h2>
            <p className="text-xs text-amber-700/80 font-mono uppercase mt-0.5">
              {language === 'fr' ? "RÉPONSE EN 20 MIN - 48 HEURES" : "20 MIN - 48 HOURS RESPONSE TIMEFRAME"}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed pl-1">
          {terms.alertBody}
        </p>
      </div>

      {/* Main Sections */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-xl shadow-sm space-y-8">
        {terms.sections.map((section, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wide flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              {section.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
              {section.body}
            </p>
          </div>
        ))}
      </div>

      {/* System Admin Helpline Box */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-slate-600 font-medium">
            {language === 'fr' 
              ? "Un problème avec l'activation de votre compte ?" 
              : "Facing issues with account validation?"}
          </span>
        </div>
        <span className="font-mono text-slate-500 bg-slate-200/50 px-2 py-1 rounded select-all">
          contactez HealthOne ou Jerttech
        </span>
      </div>
    </div>
  );
}
