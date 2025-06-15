import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import Navbar from "../components/Navbar";

export default function CourseSetup() {
  const formRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<HTMLDivElement[]>([]);
  const navigate = useNavigate();

  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");

  useEffect(() => {
    gsap.fromTo(
      formRef.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: "power2.out" }
    );

    shapesRef.current.forEach((shape, i) => {
      gsap.to(shape, {
        y: "+=20",
        x: "+=10",
        repeat: -1,
        yoyo: true,
        duration: 3 + i,
        ease: "sine.inOut",
      });
    });
  }, []);

  const addShapeRef = (el: HTMLDivElement | null) => {
    if (el && !shapesRef.current.includes(el)) {
      shapesRef.current.push(el);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !level) {
      alert("Please fill in both fields.");
      return;
    }

    // Navigate and pass subject + level via state
    navigate("/generate", {
      state: {
        subject,
        level,
      },
    });
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <Navbar />

      {/* 🎨 Background Shapes */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Shapes as before... */}
        <div ref={addShapeRef} className="absolute top-4 left-8 w-8 h-8 bg-purple-500 opacity-10 rotate-12" />
        <div ref={addShapeRef} className="absolute top-6 right-10 w-12 h-12 border border-purple-400 opacity-20 rounded-full" />
        <div ref={addShapeRef} className="absolute top-16 left-1/3 w-5 h-5 bg-purple-700 opacity-10" />
        <div ref={addShapeRef} className="absolute top-24 left-10 w-10 h-10 bg-white opacity-10 rotate-45" />
        <div ref={addShapeRef} className="absolute bottom-20 right-20 w-16 h-16 border-2 border-purple-500 opacity-20 rounded-full" />
        <div ref={addShapeRef} className="absolute top-1/2 left-1/3 w-6 h-6 bg-purple-600 opacity-20" />
        <div ref={addShapeRef} className="absolute bottom-10 left-1/4 w-12 h-12 border-2 border-white opacity-10 rotate-12" />
        <div ref={addShapeRef} className="absolute top-1/4 right-1/4 w-6 h-6 bg-white opacity-10 rotate-45" />
        <div ref={addShapeRef} className="absolute top-1/3 left-10 w-5 h-5 bg-purple-300 opacity-10 rounded-full" />
      </div>

      {/* 📦 Form Box */}
      <div
        ref={formRef}
        className="w-full max-w-xl p-10 mt-36 mx-auto rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(128,0,255,0.2)] z-10"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
          Start Building Your Personal Study Material
        </h2>
        <p className="text-center text-gray-400 mb-8">
          Enter the subject and select a difficulty level to begin
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              Subject or Topic
            </label>
            <input
              type="text"
              placeholder="e.g. Machine Learning"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 bg-[#2c2c3e]/60 text-white rounded-lg border border-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              Difficulty Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-3 bg-[#2c2c3e]/60 text-white rounded-lg border border-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
            >
              <option value="">Select Level</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-md hover:shadow-purple-500/30"
          >
            Next
          </button>
        </form>
      </div>
    </div>
  );
}
