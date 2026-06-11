import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { 
  User, 
  Lock, 
  ShieldAlert, 
  Phone, 
  Mail, 
  CheckCircle, 
  AlertCircle,
  Building2,
  Calendar,
  Save,
  Tag,
  KeyRound,
  Camera,
  Upload,
  Trash2,
  X,
  RefreshCw,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const { t, language } = useLanguage();

  const [fullName, setFullName] = useState(profile?.fullName || profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [username, setUsername] = useState(profile?.username || "");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordNotification, setPasswordNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // States for profile photo changing (Upload & Camera)
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoSource, setPhotoSource] = useState<"upload" | "camera">("upload");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Start camera helper
  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 480 },
          height: { ideal: 480 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let msg = language === 'fr'
        ? "Impossible d'accéder à la caméra. Veuillez vérifier les autorisations."
        : "Failed to access camera. Please check your system/browser permissions.";
      setCameraError(msg);
    }
  };

  // Capture frame from video
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
      const targetSize = 200; // Keep image extremely compact for Firestore limit
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        // Draw the video frame, cropping it to a square
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        
        // Mirror the canvas image to match standard user-facing video behavior
        ctx.translate(targetSize, 0);
        ctx.scale(-1, 1);
        
        ctx.drawImage(video, sx, sy, size, size, 0, 0, targetSize, targetSize);
        
        // Convert to base64 with jpeg compression
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setSelectedFile(dataUrl);
        stopCamera();
      }
    }
  };

  // Handle uploading file from device
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate is an image
      if (!file.type.startsWith("image/")) {
        alert(language === 'fr' 
          ? "Veuillez sélectionner un fichier image valide." 
          : "Please select a valid image file.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const targetSize = 200; // Resize to tiny square 200x200
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const width = img.width;
            const height = img.height;
            const size = Math.min(width, height);
            const sx = (width - size) / 2;
            const sy = (height - size) / 2;
            ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
            setSelectedFile(dataUrl);
          } else {
            setSelectedFile(reader.result as string);
          }
        };
        img.onerror = () => {
          setSelectedFile(reader.result as string);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  // Save base64 photo to Firestore
  const savePhoto = async () => {
    if (!selectedFile) return;
    setIsSavingPhoto(true);
    try {
      await updateProfile({
        photoURL: selectedFile
      });
      setShowPhotoModal(false);
      setSelectedFile(null);
    } catch (err) {
      console.error("Error saving photo:", err);
      alert(language === 'fr' ? "Erreur de sauvegarde de l'image." : "Error saving profile photo.");
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Remove photo entirely
  const removePhoto = async () => {
    const confirmed = window.confirm(
      language === 'fr' 
        ? "Voulez-vous vraiment supprimer votre photo de profil ?" 
        : "Are you sure you want to remove your profile photo?"
    );
    if (confirmed) {
      setIsSavingPhoto(true);
      try {
        await updateProfile({
          photoURL: ""
        });
        setSelectedFile(null);
      } catch (err) {
        console.error("Error removing photo:", err);
      } finally {
        setIsSavingPhoto(false);
      }
    }
  };

  // Effect to clean up webcam stream on unmount or tab switch
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification(null);

    try {
      await updateProfile({
        name: fullName.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        username: username.trim()
      });
      setNotification({
        type: "success",
        message: t("profileUpdated")
      });
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        message: t("profileUpdateError") + ": " + (err.message || "")
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordNotification({
        type: "error",
        message: language === 'fr' 
          ? "Le mot de passe doit contenir au moins 6 caractères." 
          : "Password must be at least 6 characters long."
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotification({
        type: "error",
        message: language === 'fr' 
          ? "Les mots de passe ne correspondent pas." 
          : "Passwords do not match."
      });
      return;
    }

    setPasswordSubmitting(true);
    setPasswordNotification(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No active user session found");

      await updatePassword(currentUser, newPassword);

      const docRef = doc(db, "users", currentUser.uid);
      await updateDoc(docRef, { password: newPassword });

      setPasswordNotification({
        type: "success",
        message: language === 'fr' 
          ? "Votre mot de passe a été modifié avec succès !" 
          : "Password successfully updated!"
      });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordNotification(null), 5000);
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "";
      if (err.code === "auth/requires-recent-login") {
        errMsg = language === 'fr'
          ? "Cette action nécessite une connexion récente. Veuillez vous déconnecter et vous reconnecter pour changer de mot de passe."
          : "This action requires recent authentication. Please log out, sign back in, and try again.";
      }
      setPasswordNotification({
        type: "error",
        message: errMsg
      });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const userInitials = (fullName || "U").charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Title block */}
      <div className="border-b border-slate-200 pb-4">
        <p className="text-[10px] font-mono opacity-50 uppercase tracking-[0.2em] mb-1">
          {t("settings")} / {t("userProfile")}
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-tight text-slate-900 uppercase">
          {t("profileSettings")}
        </h1>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 flex items-start gap-3 border ${
              notification.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-bold font-mono uppercase tracking-wider">
                {notification.type === "success" ? "STATUS_OK" : "STATUS_ERROR"}
              </p>
              <p className="text-xs mt-1 leading-relaxed opacity-90">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Left column: Visual Card / Read-only details */}
        <div className="bg-white border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm">
          <div className="relative group mb-2">
            <div 
              onClick={() => {
                setShowPhotoModal(true);
                setPhotoSource("upload");
                setSelectedFile(null);
              }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-3xl border-4 border-slate-100 shadow-inner relative overflow-hidden transition-all duration-300 group-hover:scale-[1.02] cursor-pointer group/avatar"
              title={language === 'fr' ? "Changer la photo de profil" : "Change profile photo"}
            >
              {profile?.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  alt={fullName || "Avatar"} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{userInitials}</span>
              )}
              {/* Elegant Hover Overlay */}
              <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200">
                <Camera className="w-5 h-5 text-white mb-1" />
                <span className="text-[9px] font-mono tracking-wider text-white uppercase font-bold">
                  {language === 'fr' ? "Modifier" : "Change"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => {
                setShowPhotoModal(true);
                setPhotoSource("upload");
                setSelectedFile(null);
              }}
              className="px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1 font-bold rounded cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              {language === 'fr' ? "Changer" : "Change photo"}
            </button>
            {profile?.photoURL && (
              <button
                onClick={removePhoto}
                disabled={isSavingPhoto}
                className="px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest border border-rose-200 text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors flex items-center gap-1 font-bold rounded cursor-pointer disabled:opacity-50"
                title={language === 'fr' ? "Supprimer la photo" : "Remove photo"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {language === 'fr' ? "Supprimer" : "Remove"}
              </button>
            )}
          </div>

          <h2 className="font-bold text-lg leading-tight uppercase truncate max-w-full">
            {fullName || profile?.username || "HealthOne Staff"}
          </h2>
          
          <div className="mt-1 flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[9px] font-mono font-bold uppercase tracking-widest leading-none">
            <ShieldAlert className="w-3 h-3" />
            {profile?.role ? t(profile.role.toUpperCase()) : t("Staff")}
          </div>

          <div className="w-full border-t border-slate-100 mt-6 pt-6 space-y-4 text-left">
            <div>
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">{t("hospitalName")}</p>
              <p className="text-xs font-medium text-slate-800 flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {profile?.hospital?.name || profile?.hospitalName || (typeof profile?.hospital === 'string' ? profile.hospital : t("hospitalName"))}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">{t("username")}</p>
              <p className="text-xs font-mono text-slate-700 flex items-center gap-1.5 mt-1">
                <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                @{profile?.username || "no_username"}
              </p>
            </div>

            {profile?.email && (
              <div>
                <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">{t("email")}</p>
                <p className="text-xs text-slate-700 flex items-center gap-1.5 mt-1 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {profile.email}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Form */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* User Information Form */}
          <div className="bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-base font-serif italic font-bold border-b border-slate-200 pb-3 uppercase tracking-widest mb-6 font-mono">
              {t("editUserInformation")}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1.5 tracking-widest">
                  {t("fullName")}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jean Dupont"
                    className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 font-sans text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1.5 tracking-widest">
                    {t("username")}
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. jdupont"
                      className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 font-mono text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono opacity-50 mb-1.5 tracking-widest">
                    {t("phoneNumber")}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                      className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 font-mono text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1.5 tracking-widest">
                  {t("designatedRole")} ({t("readOnly") || "READ_ONLY"})
                </label>
                <div className="relative opacity-60">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    disabled
                    value={profile?.role ? t(profile.role.toUpperCase()) : t("Staff")}
                    className="w-full bg-slate-100 border border-slate-200 pl-10 pr-4 py-2.5 font-sans text-sm outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-slate-900 text-white font-mono text-[10px] uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSubmitting ? "..." : t("saveProfile")}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Himself Section */}
          <div className="bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-base font-serif italic font-bold border-b border-slate-200 pb-3 uppercase tracking-widest mb-6 font-mono">
              {language === 'fr' ? "Changer de mot de passe" : "Change Password"}
            </h3>

            <AnimatePresence>
              {passwordNotification && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 flex items-start gap-3 border mb-6 ${
                    passwordNotification.type === "success" 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {passwordNotification.type === "success" ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-bold font-mono uppercase tracking-wider">
                      {passwordNotification.type === "success" ? "STATUS_OK" : "STATUS_ERROR"}
                    </p>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">{passwordNotification.message}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1.5 tracking-widest">
                  {language === 'fr' ? "Nouveau mot de passe" : "New Password"}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 font-mono text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono opacity-50 mb-1.5 tracking-widest">
                  {language === 'fr' ? "Confirmer le mot de passe" : "Confirm Password"}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 font-mono text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={passwordSubmitting}
                  className="px-8 py-3 bg-slate-900 text-white font-mono text-[10px] uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  {passwordSubmitting ? "..." : (language === 'fr' ? "Mettre à jour" : "Change Password")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Profile Photo Uploader / Camera Capture Modal */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                stopCamera();
                setShowPhotoModal(false);
                setSelectedFile(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-6 sm:p-8 z-10 overflow-hidden font-sans"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  stopCamera();
                  setShowPhotoModal(false);
                  setSelectedFile(null);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title={language === 'fr' ? "Fermer" : "Close"}
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-lg font-serif italic font-bold border-b border-slate-100 pb-3 uppercase tracking-widest text-slate-900 mb-6 font-mono">
                {language === 'fr' ? "Éditeur de Photo" : "Photo Editor"}
              </h3>

              {/* Source/Tab Selection */}
              <div className="flex border-b border-slate-200 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setSelectedFile(null);
                    setPhotoSource("upload");
                  }}
                  className={`flex-1 pb-3 text-xs uppercase font-mono tracking-wider font-bold transition-all border-b-2 ${
                    photoSource === "upload"
                      ? "border-slate-900 text-slate-900 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    {language === 'fr' ? "Importer" : "Upload File"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPhotoSource("camera");
                    startCamera();
                  }}
                  className={`flex-1 pb-3 text-xs uppercase font-mono tracking-wider font-bold transition-all border-b-2 ${
                    photoSource === "camera"
                      ? "border-slate-900 text-slate-900 font-extrabold"
                      : "border-transparent text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Camera className="w-3.5 h-3.5" />
                    {language === 'fr' ? "Prendre Photo" : "Webcam Camera"}
                  </span>
                </button>
              </div>

              {/* View/Action panel */}
              <div className="space-y-6">
                {photoSource === "upload" ? (
                  /* --- FILE UPLOAD PATH --- */
                  <div>
                    {!selectedFile ? (
                      <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-8 text-center bg-slate-50 relative group transition-colors cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center">
                          <Upload className="w-8 h-8 text-slate-300 group-hover:text-slate-600 transition-colors mb-3" />
                          <p className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wide">
                            {language === 'fr' ? "Déposer une image" : "Upload Photo File"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono">
                            {language === 'fr' ? "ou cliquez pour parcourir" : "or click to browse"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* File Preview and Accept controls */
                      <div className="flex flex-col items-center bg-slate-50 p-4 border border-slate-100 rounded-xl">
                        <div className="w-48 h-48 rounded-full border-4 border-white shadow-md overflow-hidden bg-white mb-4 relative">
                          <img
                            src={selectedFile}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="flex-1 py-2 border border-slate-200 text-slate-650 hover:bg-slate-100 font-mono text-[10px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer text-center"
                          >
                            {language === 'fr' ? "Changer" : "Clear"}
                          </button>
                          <button
                            type="button"
                            onClick={savePhoto}
                            disabled={isSavingPhoto}
                            className="flex-1 py-2 bg-slate-900 text-white hover:bg-slate-850 font-mono text-[10px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isSavingPhoto ? "..." : (language === 'fr' ? "Appliquer" : "Save Photo")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* --- CAMERA STREAM PATH --- */
                  <div>
                    {cameraError ? (
                      <div className="p-4 border border-rose-200 bg-rose-50 rounded-lg text-rose-800 text-xs text-center space-y-3">
                        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                        <p className="font-bold uppercase font-mono">{language === 'fr' ? "ERREUR MATÉRIEL" : "CAMERA ERROR"}</p>
                        <p>{cameraError}</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-4 py-2 border border-rose-300 hover:bg-rose-100/50 rounded text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
                        >
                          {language === 'fr' ? "Réessayer" : "Retry Connection"}
                        </button>
                      </div>
                    ) : !selectedFile ? (
                      /* Live Camera Feed */
                      <div className="flex flex-col items-center">
                        <div className="w-full max-w-[280px] aspect-square rounded-full border-4 border-slate-900 overflow-hidden bg-slate-950 mb-4 shadow-inner relative">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover scale-x-[-1]"
                          />
                          {!cameraStream && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-mono text-[10px] uppercase tracking-widest bg-slate-950">
                              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                              {language === 'fr' ? "Chargement..." : "Connecting..."}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 w-full justify-center">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            disabled={!cameraStream}
                            className="px-6 py-2.5 bg-slate-950 text-white hover:bg-slate-850 transition-colors rounded font-mono text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            {language === 'fr' ? "Prendre la photo" : "Capture Photo"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Captured Image Preview */
                      <div className="flex flex-col items-center bg-slate-50 p-4 border border-slate-200 rounded-xl">
                        <div className="w-48 h-48 rounded-full border-4 border-white shadow-md overflow-hidden bg-white mb-4 relative">
                          <img
                            src={selectedFile}
                            alt="Captured Photo"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              startCamera();
                            }}
                            className="flex-1 py-2 border border-slate-200 text-slate-650 hover:bg-slate-100 font-mono text-[10px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer text-center"
                          >
                            {language === 'fr' ? "Reprendre" : "Retake"}
                          </button>
                          <button
                            type="button"
                            onClick={savePhoto}
                            disabled={isSavingPhoto}
                            className="flex-1 py-2 bg-slate-900 text-white hover:bg-slate-850 font-mono text-[10px] uppercase font-bold tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {isSavingPhoto ? "..." : (language === 'fr' ? "Appliquer" : "Save Photo")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
