import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Link } from 'react-router-dom';
import { useAuth } from "../context/AuthContext"; // adjust path if needed

const Hero = () => {
  const heroRef = useRef(null);
  const { user } = useAuth();


  useEffect(() => {
    gsap.fromTo(
      heroRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' }
    );
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative h-screen flex flex-col justify-center items-center text-center text-white px-4"
    >
      {/* Background GIF */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 z-10" />

      {/* Content */}
      <div className="z-20 max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
          Learn Smarter, Not Harder.
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8">
          Personalized AI-powered learning, gamified progress, notes, and more.
        </p>
        <Link to={user? "/CourseSetup" : "/login"}>
          <button className="bg-purple-600 hover:bg-purple-800 text-white text-lg px-6 py-3 rounded-full transition duration-300">
            Get Started
          </button>
        </Link>
      </div>
    </section>
  );
};

export default Hero;