import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { Progress } from "@/components/ui/progress";
import { Award, BookOpen, CheckCircle, Lock } from "lucide-react";
import { getUserProfile, getUserGamification } from "../services/userService";
import { useToast } from "@/components/ui/use-toast";

interface Badge {
  id: string;
  name: string;
  description: string;
  xpRequired: number;
  icon: string;
  unlocked: boolean;
}

const ProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [xpLevel, setXpLevel] = useState({ current: 0, next: 100, progress: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // In a real implementation, you would fetch user profile and gamification data
      // For now, we'll use mock data
      
      // Define badge data with descriptions
      const badgeDefinitions = {
        "First Topic": {
          description: "Complete your first topic",
          xpRequired: 10,
          icon: "🏆",
        },
        "3-Day Streak": {
          description: "Study for 3 days in a row",
          xpRequired: 30,
          icon: "🔥",
        },
        "Rookie Learner": {
          description: "Earn 100 XP points",
          xpRequired: 100,
          icon: "🧠",
        },
        "Quiz Master": {
          description: "Score 100% on 5 quizzes",
          xpRequired: 200,
          icon: "📝",
        },
        "Dedicated Learner": {
          description: "Study for 7 days in a row",
          xpRequired: 500,
          icon: "📚",
        },
        "Knowledge Seeker": {
          description: "Complete 10 courses",
          xpRequired: 1000,
          icon: "🔍",
        },
      };
      
      // Get user's badges from gamification data
      const userBadges = user.gamification?.badges || [];
      
      // Create badge objects for display
      const formattedBadges: Badge[] = Object.entries(badgeDefinitions).map(([name, details]) => ({
        id: name,
        name,
        description: details.description,
        xpRequired: details.xpRequired,
        icon: details.icon,
        unlocked: userBadges.includes(name),
      }));
      
      setBadges(formattedBadges);

      // Calculate XP level and progress
      const currentXp = user.gamification?.xp || 0;
      const level = Math.floor(currentXp / 100);
      const nextLevelXp = (level + 1) * 100;
      const progress = ((currentXp - level * 100) / 100) * 100;

      setXpLevel({
        current: level,
        next: nextLevelXp,
        progress: progress,
      });
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="pt-24 px-4 max-w-6xl mx-auto">
          <div className="flex justify-center items-center h-[60vh]">
            <p className="text-xl">Loading profile information...</p>
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
          My Profile
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Information Card */}
          <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
            <div className="flex flex-col items-center mb-6">
              <img
                src="./assests/s.jpg"
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-purple-500 mb-4"
              />
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-gray-400">{user.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Level {xpLevel.current}</span>
                  <span className="text-sm font-medium">{user.gamification?.xp || 0} XP</span>
                </div>
                <Progress value={xpLevel.progress} className="h-2 bg-gray-700" />
                <p className="text-xs text-gray-400 mt-1">
                  {Math.round(xpLevel.progress)}% to Level {xpLevel.current + 1}
                </p>
              </div>

              <div className="pt-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <BookOpen size={18} /> Learning Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-400">
                      {user.progress?.length || 0}
                    </p>
                    <p className="text-xs">Courses</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-400">
                      {user.gamification?.streak || 0}
                    </p>
                    <p className="text-xs">Day Streak</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Badges Section */}
          <div className="md:col-span-2 bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Award size={20} /> Badges & Achievements
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    badge.unlocked
                      ? "bg-purple-900/30 border border-purple-500/50"
                      : "bg-gray-800/50 border border-gray-700"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full text-2xl ${
                      badge.unlocked ? "bg-purple-700" : "bg-gray-700"
                    }`}
                  >
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{badge.name}</h4>
                      {badge.unlocked ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <Lock size={16} className="text-gray-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{badge.description}</p>
                    {!badge.unlocked && (
                      <p className="text-xs text-purple-400 mt-1">
                        Requires {badge.xpRequired} XP
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;