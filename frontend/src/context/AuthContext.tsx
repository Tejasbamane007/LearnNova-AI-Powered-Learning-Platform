import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

// --- Types ---
type Badge = {
  id: string;
  name: string;
  unlocked: boolean;
};

type Progress = {
  courseId: string;
  completedTopics: Array<{
    topicId: string;
    completedAt: string;
  }>;
};

type Gamification = {
  xp: number;
  streak: number;
  badges: string[];
};

type User = {
  name: string;
  email: string;
  progress?: Progress[];
  gamification?: Gamification;
  lastProgressDate?: string;
};

export type AuthContextType = {
  user: User | null;
  login: (user: User, token?: string) => void;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
};

// --- Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider ---
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem("token");
        console.log("🔍 Token from localStorage:", token ? "Found (length: " + token.length + ")" : "Not found");
        
        // Check if we already have a user in localStorage
        const storedUser = localStorage.getItem("user");
        console.log("🔍 User from localStorage:", storedUser ? "Found" : "Not found");
        
        // If no token, don't even try to fetch
        if (!token) {
          console.log("❌ No token available, skipping fetch");
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        // Prepare headers
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        };
        
        console.log("🔍 Fetching user with headers:", headers);
        
        // First try to debug the token
        try {
          const debugResponse = await fetch("http://localhost:5000/api/auth/debug-token", {
            method: "GET",
            headers: headers,
          });
          
          const debugData = await debugResponse.json();
          console.log("🔍 Token debug response:", debugData);
        } catch (debugError) {
          console.error("❌ Token debug error:", debugError);
        }
        
        // Now fetch the actual user
        const response = await fetch("http://localhost:5000/api/auth/user", {
          method: "GET",
          credentials: "include",
          headers: headers,
        });

        console.log("🔍 User fetch response status:", response.status);
        
        if (!response.ok) {
          // If token is invalid, clear it
          if (response.status === 401 || response.status === 403) {
            console.log("❌ Unauthorized, clearing token");
            localStorage.removeItem("token");
          }
          
          // Try to get the error message
          try {
            const errorData = await response.json();
            console.error("❌ Error response:", errorData);
          } catch (e) {
            console.error("❌ Could not parse error response");
          }
          
          throw new Error("Unauthorized");
        }

        const data = await response.json();
        console.log("✅ User fetch successful:", data);
        
        if (isMounted) {
          setUser(data.user);
          // Ensure user is also saved to localStorage
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch (error) {
        console.error("❌ Failed to fetch user:", error);
        if (isMounted) {
          setUser(null);
          // Clear user from localStorage on error
          localStorage.removeItem("user");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUser();

    return () => {
      isMounted = false; // cleanup to avoid memory leaks
    };
  }, []);

  const login = useCallback((user: User, token?: string) => {
    setUser(user);
    localStorage.setItem("user", JSON.stringify(user));
    
    // If token is provided, save it
    if (token) {
      console.log("🔍 Token received in login function:", token);
      console.log("✅ Saving token to localStorage, length:", token.length);
      
      // Clear any existing token first
      localStorage.removeItem("token");
      
      // Save the new token
      localStorage.setItem("token", token);
      
      // Verify token was stored correctly
      const storedToken = localStorage.getItem("token");
      if (storedToken !== token) {
        console.error("❌ Token storage verification failed");
        console.log("Original token:", token);
        console.log("Stored token:", storedToken);
        
        // Try alternative storage method
        try {
          document.cookie = `auth_token=${token}; path=/; max-age=86400`;
          console.log("✅ Token saved to cookie as fallback");
        } catch (e) {
          console.error("❌ Failed to save token to cookie:", e);
        }
      } else {
        console.log("✅ Token storage verified, length:", storedToken.length);
      }
    } else {
      console.warn("⚠️ No token provided to login function");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log("🔍 Logging out user");
      
      // Attempt to call logout endpoint if needed
      // await fetch("http://localhost:5000/api/auth/logout", {
      //   method: "POST",
      //   credentials: "include",
      // });
    } catch (error) {
      console.error("❌ Logout error:", error);
    } finally {
      // Always clear local state regardless of server response
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      console.log("✅ User logged out, localStorage cleared");
      
      // Redirect to main page
      window.location.href = "/";
    }
  }, []);

  // Compute isAuthenticated based on user existence
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Hook ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
