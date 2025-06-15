
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import Main from "./pages/Main";
import NotFound from "./pages/NotFound";
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import MyCoursesPage from "./pages/MyCoursesPage";
import SettingsPage from "./pages/SettingsPage";
import CourseSetup from "./pages/CourseSetup";
import Generate from "./pages/generate";
import CourseNotes from "./pages/CourseNotes";
import GoogleAuthSuccess from "./pages/GoogleAuthSuccess";
import QuizPage from "./pages/QuizPage";
import TimetablePage from "./pages/StudyPlannerPage";
import PdfNotesPage from "./pages/PdfNotesPage";

const App = () => {
  // Create a QueryClient instance inside the component
  const [queryClient] = useState(() => new QueryClient());
  const [isLoading, setIsLoading] = useState(true);
  
  // Reset loading state on page refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      // This sets a flag in sessionStorage that will be checked when the page loads
      sessionStorage.setItem('pageRefreshed', 'true');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/main" element={<Main />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/my-courses" element={<MyCoursesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/CourseSetup" element={<CourseSetup />} />
            <Route path="/generate" element= {<Generate />}/>
            <Route path="/course-notes" element={<CourseNotes />} />
            <Route path="/QuizPage" element={<QuizPage />} />
            <Route path="/google-auth-success" element={<GoogleAuthSuccess />} />
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/upload-pdf" element={<PdfNotesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </AuthProvider>

  );
};

export default App;
