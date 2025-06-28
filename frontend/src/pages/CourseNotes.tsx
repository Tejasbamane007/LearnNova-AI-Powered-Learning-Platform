import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import gsap from "gsap";
import Navbar from "../components/Navbar";
import ChatBot from "../components/ChatBot";
import { generateNotes } from "../utils/api";
import { Download, MessageSquare, Check, CheckCircle2 } from "lucide-react";
import { exportNotesAsDocx } from "../utils/exportDoc";
import html2pdf from "html2pdf.js"; 
import { useAuth } from "../context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { 
  getMyCourses, 
  Course, 
  Topic, 
  markTopicCompleted, 
  getCourseProgress 
} from "../services/courseService";

export default function CourseNotes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { courseId, subject, level } = location.state || { courseId: "", subject: "", level: "" };
  const { toast } = useToast();
  const { user } = useAuth();

  const formRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<HTMLDivElement[]>([]);
  const notesRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [showChatBot, setShowChatBot] = useState(false);
  const [markingCompleted, setMarkingCompleted] = useState<string | null>(null);

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

    // Fetch course data if courseId is provided
    if (courseId) {
      console.log("🔍 CourseID detected, fetching course data:", courseId);
      fetchCourseData();
    } else {
      console.log("⚠️ No courseId available, skipping data fetch");
    }
  }, [courseId]);
  
  // Debug log for topics
  useEffect(() => {
    console.log("🔍 Topics updated:", topics.length, topics);
  }, [topics]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      console.log("🔍 Fetching course data for ID:", courseId);
      
      // Fetch course data
      const response = await getMyCourses();
      console.log("🔍 All courses:", response);
      
      if (!response || !response.courses || !Array.isArray(response.courses)) {
        console.error("❌ Invalid response format:", response);
        throw new Error("Invalid response format from server");
      }
      
      const foundCourse = response.courses.find((c: Course) => c._id === courseId);
      console.log("🔍 Found course:", foundCourse);
      
      if (foundCourse) {
        setCourse(foundCourse);
        
        if (foundCourse.topics && Array.isArray(foundCourse.topics)) {
          console.log("✅ Setting topics:", foundCourse.topics.length, "topics");
          setTopics(foundCourse.topics);
        } else {
          console.error("❌ Invalid topics format:", foundCourse.topics);
          setTopics([]);
        }
        
        // Fetch completed topics
        try {
          const progressResponse = await getCourseProgress(courseId);
          console.log("🔍 Progress response:", progressResponse);
          
          if (progressResponse && progressResponse.completedTopics) {
            const completedTopicIds = progressResponse.completedTopics.map(
              (topic: { topicId: string }) => topic.topicId
            );
            setCompletedTopics(completedTopicIds);
          }
        } catch (progressError) {
          console.error("❌ Error fetching progress:", progressError);
          // Don't fail the whole operation if progress fetch fails
        }
      } else {
        console.error("❌ Course not found in response");
        toast({
          title: "Error",
          description: "Course not found. Please try refreshing the page.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Failed to fetch course data:", error);
      toast({
        title: "Error",
        description: "Failed to load course data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addShapeRef = (el: HTMLDivElement | null) => {
    if (el && !shapesRef.current.includes(el)) {
      shapesRef.current.push(el);
    }
  };

  const handleGenerateNotes = async () => {
    // Check if token exists
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      toast({
        title: "Authentication Error",
        description: "You need to be logged in to generate notes. Please log in and try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    console.log("🔍 Generating notes for subject:", subject, "level:", level);
    
    setLoading(true);

    // Wait for the next render cycle to ensure the loader element exists
    setTimeout(() => {
      const loaderElement = document.querySelector(".generate-loader");
      if (loaderElement) {
        const tl = gsap.timeline();
        tl.to(".generate-loader", {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "back.out(1.7)",
        });
      }
    }, 0);

    try {
      const response = await generateNotes(subject, level);
      console.log("✅ Notes generated successfully:", response ? "Yes (length: " + (response.notes?.length || 0) + ")" : "No");
      
      // Get the newly created course from the response
      if (response && response.course) {
        const newCourse = response.course;
        console.log("Found course from API response:", newCourse);
        
        setCourse(newCourse);
        setTopics(newCourse.topics);
        
        // Update URL state with the new courseId
        window.history.replaceState(
          { ...location.state, courseId: newCourse._id },
          '',
          location.pathname
        );
        
        toast({
          title: "Success",
          description: "Notes generated successfully!",
        });
      } else {
        console.error("Could not get course from API response");
        // Check if it's an error message
        if (response && response.notes && response.notes.startsWith("Error:")) {
          toast({
            title: "Error",
            description: response.notes,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Warning",
            description: "Notes were generated but the course could not be loaded. Please refresh the page.",
          });
        }
      }
    } catch (error) {
      console.error("❌ Error generating notes:", error);
      toast({
        title: "Error",
        description: "Failed to generate notes. Please make sure you're logged in and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTopicCompleted = async (topicId: string) => {
    if (!courseId) {
      toast({
        title: "Error",
        description: "Course ID is missing. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setMarkingCompleted(topicId);
      const response = await markTopicCompleted(topicId, courseId);
      
      // Update local state
      setCompletedTopics((prev) => [...prev, topicId]);
      
      // Update course progress in local state
      if (course && response && response.progress) {
        setCourse({
          ...course,
          progress: {
            ...course.progress,
            completedTopics: response.progress.completedTopics,
            totalTopics: response.progress.totalTopics
          }
        });
        
        // Store the updated progress in sessionStorage to be used when returning to MyCoursesPage
        sessionStorage.setItem('courseProgressUpdated', 'true');
        sessionStorage.setItem('updatedCourseId', courseId);
      }
      
      toast({
        title: "Success",
        description: "Topic marked as completed!",
      });
    } catch (error) {
      console.error("Failed to mark topic as completed:", error);
      toast({
        title: "Error",
        description: "Failed to mark topic as completed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMarkingCompleted(null);
    }
  };

  const handleDownloadPDF = () => {
    if (notesRef.current) {
      html2pdf().from(notesRef.current).save(`${subject}_${level}_notes.pdf`);
    }
  };

  const handleDownloadDocx = () => {
    if (topics.length > 0) {
      const notesContent = topics.map(topic => 
        `${topic.title}\n\n${topic.content || topic.notes}`
      ).join('\n\n');
      
      exportNotesAsDocx(`${subject}_${level}_notes`, notesContent);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <Navbar />
      
      {/* Chat Toggle Button - Only visible when topics are loaded */}
      {topics.length > 0 && (
        <button
          onClick={() => setShowChatBot(!showChatBot)}
          className="fixed bottom-6 right-6 z-50 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-all"
          aria-label={showChatBot ? "Hide AI Assistant" : "Show AI Assistant"}
        >
          <MessageSquare size={24} />
        </button>
      )}
      
      {/* ChatBot Component */}
      <ChatBot visible={showChatBot} subject={subject} level={level} />

      {/* 🎨 Background Shapes */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[
          "top-4 left-8 w-8 h-8 bg-purple-500",
          "top-6 right-10 w-12 h-12 border border-purple-400 rounded-full",
          "top-16 left-1/3 w-5 h-5 bg-purple-700",
          "top-24 left-10 w-10 h-10 bg-white rotate-45",
          "bottom-20 right-20 w-16 h-16 border-2 border-purple-500 rounded-full",
          "top-1/2 left-1/3 w-6 h-6 bg-purple-600",
          "bottom-10 left-1/4 w-12 h-12 border-2 border-white rotate-12",
          "top-1/4 right-1/4 w-6 h-6 bg-white rotate-45",
          "top-1/3 left-10 w-5 h-5 bg-purple-300 rounded-full",
        ].map((cls, i) => (
          <div
            key={i}
            ref={addShapeRef}
            className={`absolute opacity-10 ${cls}`}
          />
        ))}
      </div>

      {/* 📄 Notes Section */}
      <div ref={formRef} className="relative z-10 max-w-4xl mx-auto mt-28 p-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-6">
          {subject} ({level}) Notes
        </h2>

        {/* Course Topics Section */}
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-6 tracking-tight">
          Course Topics
        </h3>

        {topics.length === 0 && !loading && (
          <div className="flex flex-col items-center">
            <p className="text-gray-400 mb-4">No notes found for this course. Click the button below to generate notes.</p>
            <button
              onClick={handleGenerateNotes}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all"
            >
              Generate Notes
            </button>
          </div>
        )}

        {loading && (
          <div className="generate-loader mt-10 text-purple-400 text-lg animate-pulse">
            Generating your notes... ✨
          </div>
        )}

        {topics.length > 0 && (
          <div>
            <div
              ref={notesRef}
              className="mt-10 bg-gradient-to-br from-gray-900 to-[#1e1e2e] p-8 rounded-xl text-left shadow-xl max-w-4xl mx-auto divide-y divide-indigo-800/30 border border-indigo-500/20"
            >
              {topics.map((topic, index) => (
                <div key={topic._id || index} className="py-6 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-start gap-4">
                    <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-4 tracking-tight">
                      {topic.title}
                    </h2>
                    <button
                      onClick={() => handleMarkTopicCompleted(topic._id)}
                      disabled={completedTopics.includes(topic._id) || markingCompleted === topic._id}
                      className={`mt-1 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        completedTopics.includes(topic._id)
                          ? "bg-green-900/30 text-green-400 cursor-default"
                          : "bg-purple-900/30 text-purple-400 hover:bg-purple-900/50"
                      }`}
                    >
                      {markingCompleted === topic._id ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent" />
                      ) : completedTopics.includes(topic._id) ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Completed</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Mark Complete</span>
                        </>
                      )}
                    </button>
                  </div>
                  {topic.content && (
                    <div className="markdown-content prose-lg max-w-none text-gray-200 leading-relaxed mt-3">
                      {topic.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 📥 Download Buttons */}
            <div className="mt-6 flex flex-wrap justify-center gap-4 mb-10">
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-semibold transition-all"
              >
                <Download size={18} /> Download PDF
              </button>

              <button
                onClick={handleDownloadDocx}
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-semibold transition-all"
              >
                <Download size={18} /> Download Word (.docx)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
