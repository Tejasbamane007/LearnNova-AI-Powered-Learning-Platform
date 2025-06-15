import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleAuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleGoogleAuthSuccess = () => {
      try {
        // Log all search params for debugging
        console.log('🔍 All URL search params:', Object.fromEntries([...searchParams]));
        
        // Get token and user info from URL parameters
        const token = searchParams.get('token');
        const userId = searchParams.get('userId');
        const name = searchParams.get('name');
        const email = searchParams.get('email');

        console.log('🔍 Google auth success params:', { 
          token: token ? `${token.substring(0, 10)}...` : null, 
          userId, 
          name, 
          email 
        });

        if (!token || !userId || !name || !email) {
          console.error('❌ Missing required parameters from Google auth');
          
          // Check for error message
          const error = searchParams.get('error');
          if (error) {
            console.error('❌ Google auth error:', error);
            alert(`Authentication error: ${error}`);
          } else {
            alert('Missing authentication information. Please try again.');
          }
          
          navigate('/login');
          return;
        }

        // Create user object
        const user = {
          _id: userId,
          name,
          email
        };

        // Store token in localStorage first to verify it works
        localStorage.setItem('token', token);
        console.log('✅ Token stored in localStorage');
        
        // Login the user
        login(user, token);
        console.log('✅ User logged in via Google auth');

        // Navigate to course setup
        setTimeout(() => {
          navigate('/CourseSetup');
        }, 1000); // Small delay to ensure state updates
      } catch (error) {
        console.error('❌ Error processing Google auth success:', error);
        alert('Error processing login. Please try again.');
        navigate('/login');
      }
    };

    handleGoogleAuthSuccess();
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-gray-900 text-white">
      <div className="bg-black bg-opacity-60 p-8 rounded-xl shadow-xl w-[90%] max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Google Authentication Successful</h2>
        <p className="text-gray-300 mb-6">Redirecting you to the dashboard...</p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
      </div>
    </div>
  );
};

export default GoogleAuthSuccess;