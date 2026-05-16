import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  hospitalId: string | null;
  signInWithUsername: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  hospitalId: null,
  signInWithUsername: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const sanitizedUsername = username.trim();
      console.log("LOGIN_ATTEMPT: Searching for username:", sanitizedUsername);
      
      // 1. Find user by username in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", sanitizedUsername));
      
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const profileData = { id: firebaseUser.uid, ...docSnap.data() };
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

  // Helper to extract hospitalId from various possible field names
  const getHospitalId = (profile: any) => {
    if (!profile) return null;
    if (profile.hospitalId) return profile.hospitalId;
    if (profile.hospital && typeof profile.hospital === 'string') return profile.hospital;
    if (profile.hospital && typeof profile.hospital === 'object' && profile.hospital.id) return profile.hospital.id;
    return null;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      hospitalId: getHospitalId(profile),
      signInWithUsername,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
