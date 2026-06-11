import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  hospitalId: string | null;
  signInWithUsername: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  hospitalId: null,
  signInWithUsername: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const sanitizedUsername = username.trim();
      const lowerUsername = sanitizedUsername.toLowerCase();
      console.log("LOGIN_ATTEMPT: Searching for username variants:", sanitizedUsername, lowerUsername);
      
      // 1. Find user by username in Firestore with case-insensitive fallback
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "in", [sanitizedUsername, lowerUsername]));
      
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (e: any) {
        console.error("FIRESTORE_QUERY_ERROR:", e);
        throw new Error(`Firestore query failed: ${e.message}`);
      }

      if (querySnapshot.empty) {
        throw new Error("User not found with this username");
      }

      const userData = querySnapshot.docs[0].data();
      const email = userData.email;

      if (!email) {
        throw new Error("No email linked to this username");
      }

      // 2. Sign in with Firebase Auth using the email
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw error;
    }
  };

  const logout = () => signOut(auth);

  // Helper to extract hospitalId from various possible field names
  const getHospitalId = (userProfile: any) => {
    if (!userProfile) return null;
    if (userProfile.hospitalId) return userProfile.hospitalId;
    if (userProfile.hospital && typeof userProfile.hospital === 'string') return userProfile.hospital;
    if (userProfile.hospital && typeof userProfile.hospital === 'object' && userProfile.hospital.id) return userProfile.hospital.id;
    return null;
  };

  const updateProfile = async (updates: any) => {
    if (!user) throw new Error("No user logged in");
    const docRef = doc(db, "users", user.uid);
    await updateDoc(docRef, updates);
    setProfile((prev: any) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const rawData = docSnap.data();
            const profileData = { id: firebaseUser.uid, ...rawData } as any;
            
            // Resolve the hospital name from healthone_hospitals collection
            const hId = getHospitalId(profileData);
            if (hId) {
              try {
                // Initialize with local cache first for instant loading
                const cachedName = localStorage.getItem(`healthone_hospital_name_${hId}`);
                if (cachedName) {
                  profileData.hospitalName = cachedName;
                  profileData.hospital = { id: hId, name: cachedName };
                }

                // Fetch current hospital metadata from the healthone_hospitals Firestore collection
                const hDocSnap = await getDoc(doc(db, "healthone_hospitals", hId));
                if (hDocSnap.exists()) {
                  const hData = hDocSnap.data();
                  if (hData && hData.name) {
                    profileData.hospitalName = hData.name;
                    profileData.hospital = { id: hId, name: hData.name, ...hData };
                    localStorage.setItem(`healthone_hospital_name_${hId}`, hData.name);
                  }
                }
              } catch (hErr) {
                console.error("Error fetching hospital metadata in AuthContext:", hErr);
              }
            }

            setProfile(profileData);
          } else {
            setProfile(null);
          }
          setUser(firebaseUser);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        // Fail gracefully - still set user if Firebase says they are logged in
        setUser(firebaseUser);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      hospitalId: getHospitalId(profile),
      signInWithUsername,
      logout,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
