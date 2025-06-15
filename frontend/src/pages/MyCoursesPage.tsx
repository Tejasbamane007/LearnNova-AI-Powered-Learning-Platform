import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Brain,
  CalendarClock,
  BookOpen,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { getMyCourses, deleteCourse, Course as CourseType } from "../services/courseService";
import { useToast } from "@/components/ui/use-toast";

interface CourseWithProgress {
  _id: string;
  subject: string;
  difficulty: string;
  progress: {
    completedTopics: number;
    totalTopics: number;
  };
  createdAt: string;
  hasQuiz?: boolean;
  hasTimetable?: boolean;
  hasPdfNotes?: boolean;
  topics?: {
    _id: string;
    title: string;
    content?: string;
    estimatedHours?: number;
    status?: string;
  }[];
  pdfNotes?: {
    _id: string;
    fileName: string;
    notes: string;
    createdAt: string;
  }[];
}

const MyCoursesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    
    // Check if we're returning from a page where progress was updated
    const progressUpdated = sessionStorage.getItem('courseProgressUpdated');
    const updatedCourseId = sessionStorage.getItem('updatedCourseId');
    
    if (progressUpdated === 'true' && updatedCourseId) {
      console.log('Progress was updated for course:', updatedCourseId);
      // Clear the flag so we don't keep refreshing
      sessionStorage.removeItem('courseProgressUpdated');
      sessionStorage.removeItem('updatedCourseId');
    }
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await getMyCourses();
      
      if (response && response.courses) {
        // Transform the courses to match our interface
        const formattedCourses = response.courses.map((course: CourseType) => ({
          _id: course._id,
          subject: course.subject,
          difficulty: course.difficulty,
          progress: {
            completedTopics: course.progress?.completedTopics || 0,
            totalTopics: course.topics?.length || 0,
          },
          createdAt: course.createdAt,
          hasQuiz: course.hasQuiz || false,
          hasTimetable: course.hasTimetable || false,
          hasPdfNotes: course.pdfNotes && course.pdfNotes.length > 0,
          topics: course.topics || [], // Include topics from the course
          pdfNotes: course.pdfNotes || [] // Include PDF notes from the course
        }));
        
        setCourses(formattedCourses);
        
        // Check if we need to update a specific course's progress
        const progressUpdated = sessionStorage.getItem('courseProgressUpdated');
        const updatedCourseId = sessionStorage.getItem('updatedCourseId');
        
        if (progressUpdated === 'true' && updatedCourseId) {
          console.log('Updating progress for course:', updatedCourseId);
          // Find the course that was updated
          const updatedCourse = formattedCourses.find(c => c._id === updatedCourseId);
          if (updatedCourse) {
            // Expand this course to show the updated progress
            setExpandedCourse(updatedCourseId);
          }
          
          // Clear the flags
          sessionStorage.removeItem('courseProgressUpdated');
          sessionStorage.removeItem('updatedCourseId');
        }
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      toast({
        title: "Error",
        description: "Failed to load your courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseExpansion = (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
    }
  };

  const handleCreateCourse = () => {
    navigate("/CourseSetup");
  };

  const calculateProgress = (completed: number, total: number) => {
    if (total === 0) return 0;
    return (completed / total) * 100;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      try {
        setDeleteLoading(courseId);
        await deleteCourse(courseId);
        toast({
          title: "Success",
          description: "Course deleted successfully",
        });
        // Refresh the courses list
        fetchCourses();
      } catch (error) {
        console.error("Failed to delete course:", error);
        toast({
          title: "Error",
          description: "Failed to delete the course. Please try again.",
          variant: "destructive",
        });
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="pt-24 px-4 max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-[60vh]">
            <p className="text-xl">Loading courses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-24 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">My Courses</h1>
          <button
            onClick={handleCreateCourse}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus size={18} />
            <span>New Course</span>
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 shadow-md border border-purple-500/30 text-center">
            <div className="flex justify-center mb-4">
              <BookOpen size={48} className="text-purple-400 opacity-50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No courses yet</h2>
            <p className="text-gray-400 mb-6">
              Start your learning journey by creating your first course
            </p>
            <button
              onClick={handleCreateCourse}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition inline-flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Create Course</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {courses.map((course) => (
              <div
                key={course._id}
                className="bg-gray-900 rounded-xl shadow-md border border-purple-500/30 overflow-hidden"
              >
                {/* Course Header */}
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {course.subject}
                      </h2>
                      <p className="text-gray-400 text-sm">
                        {course.difficulty} • Created on{" "}
                        {formatDate(course.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-gray-400">Progress</p>
                        <p className="font-medium">
                          {course.progress.completedTopics}/
                          {course.progress.totalTopics} topics
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteCourse(course._id)}
                          className="bg-red-900/30 hover:bg-red-900/50 p-2 rounded-full transition-colors"
                          disabled={deleteLoading === course._id}
                        >
                          {deleteLoading === course._id ? (
                            <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent" />
                          ) : (
                            <Trash2 size={20} className="text-red-400" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleCourseExpansion(course._id)}
                          className="bg-gray-800 p-2 rounded-full"
                        >
                          {expandedCourse === course._id ? (
                            <ChevronUp size={20} className="text-purple-400" />
                          ) : (
                            <ChevronDown size={20} className="text-purple-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>
                        {Math.round(
                          calculateProgress(
                            course.progress.completedTopics,
                            course.progress.totalTopics
                          )
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={calculateProgress(
                        course.progress.completedTopics,
                        course.progress.totalTopics
                      )}
                      className="h-2 bg-gray-700"
                    />
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedCourse === course._id && (
                  <div className="bg-gray-800 p-6 border-t border-gray-700">
                    <h3 className="text-lg font-medium mb-4">
                      Course Materials
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <CourseOption
                        icon={<FileText size={24} />}
                        title="Notes"
                        isGenerated={true} // Notes are always generated with the course
                        onGenerate={() => {}}
                        onView={() => navigate("/course-notes", {
                          state: { courseId: course._id, subject: course.subject, level: course.difficulty }
                        })}
                      />
                      <CourseOption
                        icon={<Brain size={24} />}
                        title="Quiz"
                        isGenerated={course.hasQuiz === true} // Explicitly check for true
                        onGenerate={() => navigate("/QuizPage", {
                          state: { courseId: course._id, subject: course.subject, level: course.difficulty, generate: true }
                        })}
                        onView={() => navigate("/QuizPage", {
                          state: { courseId: course._id, subject: course.subject, level: course.difficulty }
                        })}
                      />
                      <CourseOption
                        icon={<CalendarClock size={24} />}
                        title="Study Plan"
                        isGenerated={course.hasTimetable === true}
                        onGenerate={() => {
                          console.log("Navigating to timetable with course:", course._id);
                          navigate("/timetable", {
                            state: { 
                              courseId: course._id, 
                              subject: course.subject, 
                              level: course.difficulty, 
                              generate: true,
                              topics: course.topics // Pass topics to the timetable page
                            }
                          });
                        }}
                        onView={() => {
                          console.log("Viewing timetable for course:", course._id);
                          navigate("/timetable", {
                            state: { 
                              courseId: course._id, 
                              subject: course.subject, 
                              level: course.difficulty
                            }
                          });
                        }}
                      />
                      <CourseOption
                        icon={<BookOpen size={24} />}
                        title="PDF Notes"
                        isGenerated={course.pdfNotes && course.pdfNotes.length > 0}
                        onGenerate={() => navigate("/upload-pdf", {
                          state: { courseId: course._id, subject: course.subject, level: course.difficulty }
                        })}
                        onView={() => navigate("/upload-pdf", {
                          state: { courseId: course._id, subject: course.subject, level: course.difficulty }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface CourseOptionProps {
  icon: React.ReactNode;
  title: string;
  isGenerated: boolean;
  onGenerate: () => void;
  onView: () => void;
}

const CourseOption = ({
  icon,
  title,
  isGenerated,
  onGenerate,
  onView,
}: CourseOptionProps) => {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-purple-400">{icon}</div>
        <h4 className="font-medium">{title}</h4>
      </div>
      <button
        onClick={isGenerated ? onView : onGenerate}
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition ${
          isGenerated
            ? "bg-purple-600 hover:bg-purple-700 text-white"
            : "bg-gray-700 hover:bg-gray-600 text-white"
        }`}
      >
        {isGenerated ? "View" : "Generate"}
      </button>
    </div>
  );
};

export default MyCoursesPage;