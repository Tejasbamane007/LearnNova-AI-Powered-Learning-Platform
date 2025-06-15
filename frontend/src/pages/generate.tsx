import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { NotebookText, Brain, CalendarClock, FileText } from "lucide-react";
import Navbar from "../components/Navbar";

export default function OptionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<HTMLDivElement[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { subject, level } = location.state || { subject: "", level: "" };

  useEffect(() => {
    gsap.fromTo(
      formRef.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: "power2.out" }
    );

    gsap.fromTo(
      cardRefs.current,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.2,
        ease: "power2.out",
      }
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

  const handleNavigation = (path: string) => {
    navigate(path, {
      state: { subject, level },
    });
  };

  const addCardRef = (el: HTMLDivElement | null) => {
    if (el && !cardRefs.current.includes(el)) {
      cardRefs.current.push(el);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <Navbar />

      {/* 🎨 Animated Background Shapes */}
      <div className="absolute inset-0 pointer-events-none z-0">
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

      {/* 📦 Main Content */}
      <div
        ref={formRef}
        className="relative z-10 w-full max-w-6xl mx-auto mt-32 p-10 text-center"
      >
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-12">
          What would you like to generate for <br />
          <span className="text-purple-400">{subject}</span> ({level})?
        </h2>

        <div className="flex flex-wrap justify-center gap-8">
          <OptionCard
            refCallback={addCardRef}
            icon={<NotebookText size={36} />}
            title="Topic-wise Course"
            onClick={() => handleNavigation("/course-notes")}
          />
          <OptionCard
            refCallback={addCardRef}
            icon={<Brain size={36} />}
            title="Topic-wise Quiz"
            onClick={() => handleNavigation("/QuizPage")}
          />
          <OptionCard
            refCallback={addCardRef}
            icon={<CalendarClock size={36} />}
            title="Generate Study-Plan"
            onClick={() => handleNavigation("/timetable")}
          />
          <OptionCard
           refCallback={addCardRef}
           icon={<FileText size={36} />}
           title="Generate Notes from PDF"
           onClick={() => handleNavigation("/upload-pdf")}
          />
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  icon,
  title,
  onClick,
  refCallback,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  refCallback: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={refCallback}
      onClick={onClick}
      className="cursor-pointer flex flex-col items-center justify-center gap-4 bg-[#2c2c3e]/60 p-8 rounded-2xl border border-purple-500/30 shadow-md hover:shadow-purple-500/40 hover:bg-purple-600/20 transition-all w-60"
    >
      <div className="text-purple-400">{icon}</div>
      <div className="text-xl font-semibold text-white text-center">{title}</div>
    </div>
  );
}
