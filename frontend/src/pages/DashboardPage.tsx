import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BookOpen,
  GraduationCap,
  BarChart2,
  TrendingUp,
} from "lucide-react";
import { getMyCourses } from "../services/courseService";
import { useToast } from "@/components/ui/use-toast";

interface CourseStats {
  completed: number;
  inProgress: number;
  notStarted: number;
}

interface QuizScore {
  topic: string;
  score: number;
}

const DashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courseStats, setCourseStats] = useState<CourseStats>({
    completed: 0,
    inProgress: 0,
    notStarted: 0,
  });
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [totalCourses, setTotalCourses] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch courses
      const coursesResponse = await getMyCourses();
      
      if (coursesResponse && coursesResponse.courses) {
        const courses = coursesResponse.courses;
        setTotalCourses(courses.length);
        
        // Calculate course stats
        let completed = 0;
        let inProgress = 0;
        let notStarted = 0;
        
        courses.forEach((course: any) => {
          const completedTopics = course.progress?.completedTopics || 0;
          const totalTopics = course.topics?.length || 0;
          
          if (totalTopics === 0) {
            notStarted++;
          } else if (completedTopics === totalTopics) {
            completed++;
          } else if (completedTopics > 0) {
            inProgress++;
          } else {
            notStarted++;
          }
        });
        
        setCourseStats({
          completed,
          inProgress,
          notStarted,
        });
        
        // Extract quiz scores from courses
        const quizData: QuizScore[] = [];
        
        courses.forEach((course: any) => {
          if (course.progress?.testScores && course.progress.testScores.length > 0) {
            course.progress.testScores.forEach((score: any) => {
              quizData.push({
                topic: score.topic,
                score: score.score,
              });
            });
          }
        });
        
        // If no quiz data found, use mock data
        if (quizData.length === 0) {
          const mockQuizScores = [
            { topic: "Introduction", score: 85 },
            { topic: "Basic Concepts", score: 92 },
            { topic: "Advanced Topics", score: 78 },
            { topic: "Practical Applications", score: 88 },
            { topic: "Case Studies", score: 95 },
          ];
          setQuizScores(mockQuizScores);
        } else {
          setQuizScores(quizData);
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
      
      // Set mock data as fallback
      setCourseStats({
        completed: 1,
        inProgress: 2,
        notStarted: 3,
      });
      
      const mockQuizScores = [
        { topic: "Introduction", score: 85 },
        { topic: "Basic Concepts", score: 92 },
        { topic: "Advanced Topics", score: 78 },
        { topic: "Practical Applications", score: 88 },
        { topic: "Case Studies", score: 95 },
      ];
      
      setQuizScores(mockQuizScores);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#8b5cf6", "#4c1d95", "#2e1065"];

  const pieData = [
    { name: "Completed", value: courseStats.completed },
    { name: "In Progress", value: courseStats.inProgress },
    { name: "Not Started", value: courseStats.notStarted },
  ];

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="pt-24 px-4 max-w-6xl mx-auto">
          <div className="flex flex-col justify-center items-center h-[60vh]">
            <div className="animate-spin h-12 w-12 border-4 border-purple-500 rounded-full border-t-transparent mb-4"></div>
            <p className="text-xl">Loading dashboard information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-24 px-4 max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center md:text-left">
          Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30 flex items-center gap-4">
            <div className="bg-purple-900/50 p-3 rounded-lg">
              <BookOpen size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Courses</p>
              <p className="text-2xl font-bold">
                {totalCourses}
              </p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30 flex items-center gap-4">
            <div className="bg-purple-900/50 p-3 rounded-lg">
              <GraduationCap size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Completed</p>
              <p className="text-2xl font-bold">{courseStats.completed}</p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30 flex items-center gap-4">
            <div className="bg-purple-900/50 p-3 rounded-lg">
              <TrendingUp size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">XP Points</p>
              <p className="text-2xl font-bold">{user.gamification?.xp || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Course Progress Chart */}
          <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart2 size={20} /> Course Progress
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quiz Performance Chart */}
          <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart2 size={20} /> Quiz Performance
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={quizScores}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="topic"
                    tick={{ fill: "#aaa" }}
                    tickLine={{ stroke: "#aaa" }}
                  />
                  <YAxis
                    tick={{ fill: "#aaa" }}
                    tickLine={{ stroke: "#aaa" }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#333",
                      border: "1px solid #555",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="score"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Additional information section */}
        <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen size={20} /> Learning Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="font-medium mb-2">Generate Quizzes</h3>
              <p className="text-sm text-gray-400 mb-3">
                Create custom quizzes for any topic to test your knowledge
              </p>
              <button 
                onClick={() => navigate("/QuizPage")}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                Create Quiz →
              </button>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="font-medium mb-2">Upload PDF Notes</h3>
              <p className="text-sm text-gray-400 mb-3">
                Generate AI-powered study notes from your PDF documents
              </p>
              <button 
                onClick={() => navigate("/upload-pdf")}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                Upload PDF →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;