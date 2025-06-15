import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const Signup = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Helper function to login with token
  const loginWithToken = (user: any, token: string) => {
    console.log("🔍 Logging in with token, length:", token.length);
    
    // Save token to localStorage
    localStorage.setItem('token', token);
    
    // Verify token was stored
    const storedToken = localStorage.getItem("token");
    console.log("🔍 Token stored in localStorage:", storedToken ? "Yes (length: " + storedToken.length + ")" : "No");
    
    // Login the user
    login(user, token);
    
    // Navigate to course setup
    navigate("/CourseSetup");
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      console.log("🔍 Attempting signup with email:", email);
      
      const res = await axios.post(
        "http://localhost:5000/api/auth/register",
        { name, email, password },
        { withCredentials: true }
      );

      console.log("✅ Signup response:", res.data);
      
      // Check if we have user and token in the response
      const { user, token } = res.data;
      console.log("🔍 User received:", user ? "Yes" : "No");
      
      if (!user) {
        console.error("❌ No user data received from server");
        setError("Registration failed. Please try again.");
        return;
      }
      
      // If no token in response, generate one
      if (!token) {
        console.log("❌ No token in signup response, generating one");
        try {
          // Generate a token using a separate API call
          const tokenRes = await axios.get(
            "http://localhost:5000/api/auth/generate-test-token",
            { withCredentials: true }
          );
          
          console.log("✅ Token generation response:", tokenRes.data);
          const newToken = tokenRes.data.token;
          
          if (newToken) {
            console.log("✅ Generated new token, length:", newToken.length);
            // Use the new token
            return loginWithToken(user, newToken);
          }
        } catch (error) {
          console.error("❌ Failed to generate token:", error);
          setError("Registration successful but login failed. Please try logging in.");
          setTimeout(() => navigate("/login"), 2000);
          return;
        }
      }
      
      // If we have a token from the registration response, use it
      if (token) {
        console.log("🔍 Token received from registration:", token ? "Yes (length: " + token.length + ")" : "No");
        
        // Verify token is valid (should be at least 100 characters)
        if (token.length < 100) {
          console.error("❌ Token from registration is too short:", token.length);
          // Fall back to generating a test token
          const tokenRes = await axios.get(
            "http://localhost:5000/api/auth/generate-test-token",
            { withCredentials: true }
          );
          
          const testToken = tokenRes.data.token;
          console.log("✅ Generated test token, length:", testToken.length);
          
          return loginWithToken(user, testToken);
        }
        
        // Use the token from registration
        return loginWithToken(user, token);
      } else {
        console.error("❌ No token received from server");
        setError("Registration successful but login failed. Please try logging in.");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err: any) {
      console.error("❌ Signup failed:", err);
      
      // Log detailed error information
      if (err.response) {
        console.error("❌ Error response:", {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers
        });
      } else if (err.request) {
        console.error("❌ Error request:", err.request);
      } else {
        console.error("❌ Error message:", err.message);
      }
      
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    }
  };

  const handleGoogleSignup = () => {
    console.log("🔍 Initiating Google signup");
    // Open in the same window to ensure cookies are properly set
    window.location.href = "http://localhost:5000/auth/google";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-gray-900 text-white">
      <form
        onSubmit={handleSignup}
        className="bg-black bg-opacity-60 p-8 rounded-xl shadow-xl w-[90%] max-w-md space-y-6"
      >
        <h2 className="text-2xl font-bold text-center">Create an Account</h2>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <input
          type="text"
          placeholder="Name"
          className="w-full px-4 py-2 rounded bg-gray-800 text-white outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-2 rounded bg-gray-800 text-white outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full px-4 py-2 rounded bg-gray-800 text-white outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 transition px-4 py-2 rounded-lg font-semibold"
        >
          Sign Up
        </button>

        <div className="flex items-center justify-between py-2">
          <hr className="border-gray-600 w-1/4" />
          <p className="text-sm text-gray-400">or</p>
          <hr className="border-gray-600 w-1/4" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          className="w-full bg-white text-black px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:scale-105 transition"
        >
          <img src="./assests/google.png" alt="Google" className="w-5 h-5" />
          Sign up with Google
        </button>

        <p className="text-sm text-center text-gray-400 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-400 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Signup;
