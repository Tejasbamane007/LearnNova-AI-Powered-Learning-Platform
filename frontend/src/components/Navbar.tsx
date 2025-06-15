import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { User, Settings, GraduationCap, Moon, LogOut, HelpCircle, BookOpen, BrainCircuit, LayoutDashboard } from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="fixed w-full top-0 z-40 flex items-center justify-between px-6 py-4 backdrop-blur bg-black/60 text-white">
      <Link to="/" className="flex items-center space-x-2 text-2xl font-bold hover:opacity-80 transition-opacity">
        <div className="h-10 w-10 rounded-full bg-white p-1 shadow-lg shadow-purple-500/50">
          <img
            src="./assests/logo.webp"
            alt="EduAI Logo"
            className="h-full w-full object-cover rounded-full"
          />
        </div>
        <span>LearnNova</span>
      </Link>

      {user && (
        <div className="hidden md:flex items-center space-x-6 mx-auto text-sm font-medium">
          <Link to="/dashboard" className="flex items-center gap-2 hover:text-purple-400 transition-colors">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link to="/my-courses" className="flex items-center gap-2 hover:text-purple-400 transition-colors">
            <BookOpen size={18} />
            <span>My Courses</span>
          </Link>
          <Link to="/CourseSetup" className="flex items-center gap-2 hover:text-purple-400 transition-colors">
            <BrainCircuit size={18} />
            <span>Create Course</span>
          </Link>
        </div>
      )}

      <div className="relative">
        {!user ? (
          <div className="space-x-4">
            <Link to="/login">
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition">
                Login
              </button>
            </Link>
            <Link to="/signup">
              <button className="bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-lg transition">
                Sign Up
              </button>
            </Link>
          </div>
        ) : (
          <div className="relative">
  <button
    onClick={() => setShowDropdown(!showDropdown)}
    className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
  >
    <img
      src="./assests/s.jpg"
      alt="User Avatar"
      className="w-9 h-9 rounded-full border-2 border-white shadow-sm"
    />
    <span className="hidden md:inline font-medium">{user.name}</span>
  </button>

  {showDropdown && (
    <div className="absolute right-0 mt-4 w-80 bg-gradient-to-br from-black to-gray-900 text-white rounded-2xl shadow-2xl border border-purple-600/40 backdrop-blur-md p-6 z-50 animate-fade-in transition-all duration-300 space-y-5">
      
      {/* User Info */}
      <div className="flex items-center gap-4">
        <img
          src="./assests/s.jpg"
          alt="User Avatar"
          className="w-14 h-14 rounded-full border-2 border-purple-500 shadow-md"
        />
        <div>
          <p className="font-bold text-xl leading-5">{user.name}</p>
          <p className="text-sm text-gray-400 break-words">{user.email}</p>
        </div>
      </div>

      <hr className="border-gray-700" />

      {/* Navigation Links */}
      <div className="flex flex-col gap-3 text-base font-medium">
  <Link to="/profile" className="flex items-center gap-3 hover:text-purple-400 transition" onClick={() => setShowDropdown(false)}>
    <User size={18} /> Profile
  </Link>
  <Link to="/dashboard" className="flex items-center gap-3 hover:text-purple-400 transition" onClick={() => setShowDropdown(false)}>
    <LayoutDashboard size={18} /> Dashboard
   </Link>
  <Link to="/my-courses" className="flex items-center gap-3 hover:text-purple-400 transition" onClick={() => setShowDropdown(false)}>
    <BookOpen size={18} /> My Courses
  </Link>
  <Link to="/settings" className="flex items-center gap-3 hover:text-purple-400 transition" onClick={() => setShowDropdown(false)}>
    <Settings size={18} /> Settings
  </Link>
  <button className="flex items-center gap-3 text-left hover:text-purple-400 transition">
    <Moon size={18} /> Toggle Theme
  </button>
</div>

<hr className="border-gray-700" />

<div className="flex flex-col gap-2 text-base">
  <button
    onClick={logout}
    className="flex items-center gap-3 text-left text-red-500 hover:text-red-400 transition"
  >
    <LogOut size={18} /> Logout
  </button>
  <button className="flex items-center gap-3 text-left text-purple-400 hover:text-purple-300 transition">
    <HelpCircle size={18} /> Help & Support
  </button>
</div>

    </div>
  )}
</div>

        )}
      </div>
    </nav>
  );
};

export default Navbar;

