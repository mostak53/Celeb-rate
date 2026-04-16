import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          console.log("User authenticated:", firebaseUser.uid);
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            console.log("Profile found:", userDoc.data());
            setProfile(userDoc.data() as UserProfile);
          } else {
            console.log("No profile found, creating one...");
            // Create default profile if it doesn't exist
            const userEmail = firebaseUser.email || `user_${firebaseUser.uid.slice(0, 5)}@example.com`;
            const newProfile: UserProfile = {
              userId: firebaseUser.uid,
              email: userEmail,
              role: userEmail === "252-15-974@diu.edu.bd" ? 'admin' : 'user'
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
            console.log("Profile created successfully");
          }
        } catch (error: any) {
          console.error("Error in AuthContext profile logic:", error);
          // Even if profile fetch fails, we should stop loading so the user can at least see the app
          // (though they might have limited functionality if profile is null)
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin: profile?.role === 'admin',
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);
