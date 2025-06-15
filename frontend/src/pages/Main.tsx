
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import  Navbar from '../components/Navbar';
import Hero from '../components/Hero';

const Main = () => {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Check if page was refreshed
    const wasRefreshed = sessionStorage.getItem('pageRefreshed') === 'true';
    
    if (wasRefreshed) {
      // Clear the flag
      sessionStorage.removeItem('pageRefreshed');
      // Redirect to loading page
      navigate('/', { replace: true });
    } else {
      setIsReady(true);
    }
  }, [navigate]);
  
  if (!isReady) {
    return null; // Don't render anything while checking
  }
  
  return (
    <div className="min-h-screen overflow-x-hidden bg-black">
      <Navbar />
      <Hero />
    </div>
  );
};

export default Main;

