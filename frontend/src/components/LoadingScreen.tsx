
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';

const LoadingScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress from 0 to 100 over 5 seconds
    const tl = gsap.timeline();
    tl.to({ value: 0 }, {
      value: 100,
      duration: 3,
      ease: "elastic.out(1, 0.3)",
      onUpdate: function() {
        setProgress(this.targets()[0].value);
      },
      onComplete: () => {
        navigate('/main');
      }
    });

    return () => {
      tl.kill();
    };
  }, [navigate]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-black flex flex-col items-center justify-center px-4 space-y-8"
    >
      {/* Logo with glowing effect */}
{/* Logo Image */}
<img 
  src="../assests/logo.webp"
  alt="Logo"
  className="w-24 h-24 rounded-full object-cover shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse"
/>
      
      {/* Progress bar container */}
      <div className="w-full max-w-[300px] space-y-4">
        <div className="relative">
          <Progress 
            value={progress} 
            className="h-4 bg-gray-800 rounded-full overflow-hidden shadow-[0_0_10px_rgba(255,255,255,0.3)]" 
          />
          {/* Striped overlay */}
          <div 
            className="absolute top-0 left-0 h-full bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] w-full animate-[progress-stripes_1s_linear_infinite]"
            style={{
              clipPath: `polygon(0 0, ${progress}% 0, ${progress}% 100%, 0 100%)`
            }}
          />
        </div>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white text-center text-xl uppercase tracking-[0.2em] opacity-80"
        >
          Loading...
        </motion.p>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
