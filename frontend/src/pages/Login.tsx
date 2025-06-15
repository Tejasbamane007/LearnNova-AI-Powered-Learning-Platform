import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      console.log("🔍 Attempting login with email:", email);
      
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password },
        { withCredentials: true } // Needed if backend uses cookies
      );

      console.log("✅ Login response:", res.data);
      
      const { token, user } = res.data;
      
      console.log("🔍 Token received:", token ? "Yes (length: " + token.length + ")" : "No");
      console.log("🔍 User received:", user ? "Yes" : "No");
      
      // Pass both user and token to login function
      login(user, token); // Stores both in context and localStorage
      
      // Verify token was stored
      const storedToken = localStorage.getItem("token");
      console.log("🔍 Token stored in localStorage:", storedToken ? "Yes (length: " + storedToken.length + ")" : "No");
      
      navigate("/CourseSetup"); // Redirect after login
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      
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
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  const handleGoogleLogin = () => {
    console.log("🔍 Initiating Google login");
    // Open in the same window to ensure cookies are properly set
    window.location.href = "http://localhost:5000/auth/google";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-gray-900 text-white">
      <form
        onSubmit={handleLogin}
        className="bg-black bg-opacity-60 p-8 rounded-xl shadow-xl w-[90%] max-w-md space-y-6"
      >
        <h2 className="text-2xl font-bold text-center">Login to LearnNova</h2>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

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
          Login
        </button>

        <div className="flex items-center justify-between py-2">
          <hr className="border-gray-600 w-1/4" />
          <p className="text-sm text-gray-400">or</p>
          <hr className="border-gray-600 w-1/4" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-white text-black px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:scale-105 transition"
        >
          <img src="./assests/google.png" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="text-sm text-center text-gray-400 mt-4">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-purple-400 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
