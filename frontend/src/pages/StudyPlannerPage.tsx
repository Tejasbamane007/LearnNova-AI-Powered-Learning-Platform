import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { CalendarClock, Loader2, ArrowLeft, Plus, Trash2, Clock, BookOpen, Coffee, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { generateTimetable as apiGenerateTimetable, getCourseTimetable, markSessionCompleted, getCourseById } from "../services/courseService";

// Define interfaces for our data structures
interface StudyTopic {
  title: string;
  hours: number;
}

interface StudySession {
  topic: string;
  startTime: string;
  endTime: string;
  duration: number;
  isBreak: boolean;
  completed?: boolean;
}

interface TimetableEntry {
  date: string;
  sessions: StudySession[];
}

// Helper function to format time properly
const formatTimeString = (timeStr: string): string => {
  // Handle cases where time might be in decimal format like "11.25:00"
  if (timeStr.includes('.')) {
    const parts = timeStr.split(':');
    const hourPart = parts[0];
    
    if (hourPart.includes('.')) {
      const [hours, fraction] = hourPart.split('.');
      let hoursNum = parseInt(hours, 10);
      let minutesNum = Math.round(parseFloat(`0.${fraction}`) * 60);
      
      // Handle overflow
      if (minutesNum === 60) {
        hoursNum += 1;
        minutesNum = 0;
      }
      
      // Handle 24+ hour times
      if (hoursNum >= 24) {
        hoursNum = hoursNum % 24;
      }
      
      return `${String(hoursNum).padStart(2, '0')}:${String(minutesNum).padStart(2, '0')}`;
    }
  }
  
  // Handle regular time strings but ensure proper formatting
  try {
    const [hours, minutes] = timeStr.split(':');
    let hoursNum = parseInt(hours, 10);
    let minutesNum = parseInt(minutes, 10);
    
    // Handle 24+ hour times
    if (hoursNum >= 24) {
      hoursNum = hoursNum % 24;
    }
    
    return `${String(hoursNum).padStart(2, '0')}:${String(minutesNum).padStart(2, '0')}`;
  } catch (e) {
    // If parsing fails, return the original string
    return timeStr;
  }
};

// Local timetable generator function as a fallback
const generateLocalTimetable = (startDate: string, endDate: string, topics: StudyTopic[]): TimetableEntry[] => {
  // Simple implementation that creates a basic timetable
  const timetable: TimetableEntry[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Get all dates in the range
  const dates: Date[] = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Distribute topics across dates
  let topicIndex = 0;
  for (const date of dates) {
    if (topicIndex >= topics.length) break;
    
    const sessions: StudySession[] = [];
    let currentHour = 9; // Start at 9 AM
    
    // Add up to 3 topics per day
    for (let i = 0; i < 3; i++) {
      if (topicIndex >= topics.length) break;
      
      const topic = topics[topicIndex];
      const duration = topic.hours * 60; // Convert to minutes
      
      // Format times
      const startTime = `${String(currentHour).padStart(2, '0')}:00`;
      const endHour = currentHour + Math.floor(topic.hours);
      const endMinutes = Math.round((topic.hours % 1) * 60);
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
      
      // Add study session
      sessions.push({
        topic: topic.title,
        startTime,
        endTime,
        duration,
        isBreak: false,
        completed: false
      });
      
      // Add a break unless it's the last topic
      if (i < 2 && topicIndex < topics.length - 1) {
        const breakStartTime = endTime;
        const breakEndHour = endHour + (endMinutes + 15 >= 60 ? 1 : 0);
        const breakEndMinutes = (endMinutes + 15) % 60;
        const breakEndTime = `${String(breakEndHour).padStart(2, '0')}:${String(breakEndMinutes).padStart(2, '0')}`;
        
        sessions.push({
          topic: "Break",
          startTime: breakStartTime,
          endTime: breakEndTime,
          duration: 15, // 15 minute break
          isBreak: true,
          completed: false
        });
        
        currentHour = breakEndHour + (breakEndMinutes > 0 ? 1 : 0);
      } else {
        currentHour = endHour + 1; // Move to next hour for next topic
      }
      
      topicIndex++;
    }
    
    // Add this day to the timetable
    if (sessions.length > 0) {
      timetable.push({
        date: date.toISOString().split('T')[0],
        sessions
      });
    }
  }
  
  return timetable;
};

const TimetablePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { courseId, subject, level, generate } = location.state || { courseId: "", subject: "", level: "", generate: false };
  
  // State management
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [studyTopics, setStudyTopics] = useState<StudyTopic[]>([
    { title: "", hours: 2 }
  ]);

  // Function to load course topics
  const loadCourseTopics = async () => {
    try {
      if (!courseId) return;
      
      console.log("Loading topics for course:", courseId);
      const response = await getCourseById(courseId);
      
      if (response.success && response.course) {
        const course = response.course;
        
        if (course.topics && course.topics.length > 0) {
          // Map course topics to study topics format
          const courseTopics = course.topics.map(topic => ({
            title: topic.title,
            hours: topic.estimatedHours || 2
          }));
          
          console.log("Loaded topics from course:", courseTopics);
          setStudyTopics(courseTopics);
        } else {
          console.log("No topics found in course, using default topics");
          // Set default topics based on subject
          const defaultTopics = [
            { title: `Introduction to ${subject || 'the Subject'}`, hours: 1.5 },
            { title: `Core Concepts in ${subject || 'the Subject'}`, hours: 2 },
            { title: `Advanced Topics in ${subject || 'the Subject'}`, hours: 3 }
          ];
          setStudyTopics(defaultTopics);
        }
      }
    } catch (error) {
      console.error("Error loading course topics:", error);
      toast({
        title: "Error",
        description: "Failed to load course topics. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Function to fetch existing timetable
  const fetchExistingTimetable = async () => {
    try {
      if (!courseId) return;
      
      console.log("Fetching existing timetable for course:", courseId);
      const response = await getCourseTimetable(courseId);
      
      if (response.success && response.timetable) {
        console.log("Loaded existing timetable:", response.timetable);
        setTimetable(response.timetable);
        
        // Also update dates and topics if available
        if (response.startDate) {
          setStartDate(new Date(response.startDate).toISOString().split('T')[0]);
        }
        
        if (response.endDate) {
          setEndDate(new Date(response.endDate).toISOString().split('T')[0]);
        }
        
        if (response.topics && Array.isArray(response.topics) && response.topics.length > 0) {
          setStudyTopics(response.topics);
        }
      } else {
        console.log("No existing timetable found");
        // Load topics but don't generate timetable
        await loadCourseTopics();
      }
    } catch (error) {
      console.error("Error fetching timetable:", error);
      // If we can't fetch the timetable, at least try to load the topics
      await loadCourseTopics();
    }
  };

  // Initialize the page
  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      
      if (courseId) {
        console.log("Course ID detected:", courseId);
        
        // Check if we have topics in location state
        if (location.state?.topics && Array.isArray(location.state.topics) && location.state.topics.length > 0) {
          console.log("Using topics from location state:", location.state.topics);
          
          const stateTopics = location.state.topics.map((topic: any) => ({
            title: typeof topic === 'string' ? topic : (topic.title || `Topic ${Math.random().toString(36).substring(7)}`),
            hours: typeof topic === 'object' && topic.hours ? topic.hours : 2
          }));
          
          setStudyTopics(stateTopics);
        }
        
        if (generate) {
          // Load topics from course but don't auto-generate
          await loadCourseTopics();
          
          // Let the user click the generate button themselves
          console.log("Topics loaded, waiting for user to click generate");
        } else {
          // If not in generate mode, fetch existing timetable
          await fetchExistingTimetable();
        }
      } else {
        console.log("No course ID provided");
      }
      
      setLoading(false);
    };
    
    initializePage();
  }, [courseId, subject, level, generate]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const newDate = e.target.value;
    
    if (type === 'start') {
      setStartDate(newDate);
    } else {
      setEndDate(newDate);
    }
  };

  // Handle topic change
  const handleTopicChange = (index: number, field: 'title' | 'hours', value: string | number) => {
    const updatedTopics = [...studyTopics];
    
    if (field === 'title') {
      updatedTopics[index].title = value as string;
    } else {
      updatedTopics[index].hours = Number(value);
    }
    
    setStudyTopics(updatedTopics);
  };

  // Add a new topic
  const addTopic = () => {
    setStudyTopics([...studyTopics, { title: "", hours: 0 }]);
  };

  // Remove a topic
  const removeTopic = (index: number) => {
    if (studyTopics.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "You need at least one topic for your study plan.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedTopics = [...studyTopics];
    updatedTopics.splice(index, 1);
    setStudyTopics(updatedTopics);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate timetable with specific topics
  const generateTimetableWithTopics = async (topics: StudyTopic[]) => {
    try {
      if (!courseId) {
        // If no course ID, generate a local timetable
        const localTimetable = generateLocalTimetable(startDate, endDate, topics);
        setTimetable(localTimetable);
        return;
      }
      
      // Validate topics and ensure hours are set to 0 for AI assignment
      const validTopics = topics
        .filter(topic => topic && typeof topic === 'object')
        .filter(topic => (topic.title || '').trim().length > 0) // Filter out topics with empty titles
        .map(topic => ({
          ...topic,
          title: (topic.title || '').trim(),
          hours: 0 // Set hours to 0 so the backend AI will assign appropriate hours
        }));
      
      if (!validTopics || validTopics.length === 0) {
        console.error("No valid topics to generate timetable with");
        toast({
          title: "No Valid Topics",
          description: "Please add at least one topic with a title. Empty topics will be ignored.",
          variant: "destructive",
        });
        const localTimetable = generateLocalTimetable(startDate, endDate, [{ title: "Default Topic", hours: 2 }]);
        setTimetable(localTimetable);
        return;
      }
      
      console.log("Generating timetable with topics:", validTopics);
      
      // Otherwise, use the API to generate a timetable
      const response = await apiGenerateTimetable(courseId, {
        startDate,
        endDate,
        topics: validTopics
      });
      
      if (response.success && response.timetable) {
        console.log("Generated timetable from API:", response.timetable);
        setTimetable(response.timetable);
      } else {
        console.log("API timetable generation failed, using local generation");
        const localTimetable = generateLocalTimetable(startDate, endDate, topics);
        setTimetable(localTimetable);
      }
    } catch (error) {
      console.error("Error generating timetable:", error);
      
      // Fallback to local generation
      console.log("Falling back to local timetable generation");
      const localTimetable = generateLocalTimetable(startDate, endDate, topics);
      setTimetable(localTimetable);
    }
  };

  // Handle generate timetable button click
  const handleGenerateTimetable = async () => {
    try {
      setGenerating(true);
      
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        toast({
          title: "Invalid Date Range",
          description: "End date must be after start date.",
          variant: "destructive",
        });
        setGenerating(false);
        return;
      }
      
      // Calculate date range info
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const isVeryShortRange = daysDiff <= 2;
      
      // Count weekdays
      let weekdays = 0;
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const day = currentDate.getDay();
        if (day !== 0 && day !== 6) weekdays++;
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // For very short ranges, include weekends
      const availableDays = isVeryShortRange ? daysDiff : weekdays;
      const effectiveDays = isVeryShortRange ? availableDays : weekdays;
      
      // Calculate how many hours we can reasonably fit per day
      const maxHoursPerDay = isVeryShortRange ? 8 : 5; // Allow more hours for short ranges
      const totalTopics = studyTopics.length;
      
      // Show informational messages but don't prevent generation
      if (effectiveDays === 0) {
        // This should never happen since we always have at least one day
        toast({
          title: "Note",
          description: "Very short date range selected. We'll create a compact study plan for you.",
          variant: "default",
        });
      } else if (isVeryShortRange) {
        // For very short ranges, show an informational message
        toast({
          title: "Short Range Plan",
          description: `Creating a compact study plan for ${totalTopics} topics over ${effectiveDays} days.`,
          variant: "default",
        });
      } else if (weekdays < Math.ceil(totalTopics / 3)) {
        // If we have many topics but few days, show a suggestion
        toast({
          title: "Note",
          description: `Your plan will fit ${totalTopics} topics into ${weekdays} weekdays. Consider extending your date range for a more balanced schedule.`,
          variant: "default",
        });
      }
  
      // Validate topics before generating and set hours to 0 for AI assignment
      const validatedTopics = studyTopics
        .filter(topic => topic && typeof topic === 'object') // Ensure each topic is an object
        .filter(topic => (topic.title || '').trim().length > 0) // Filter out topics with empty titles
        .map(topic => ({
          ...topic,
          title: (topic.title || '').trim(),
          hours: 0 // Set hours to 0 so the backend AI will assign appropriate hours
        }));
      
      if (!validatedTopics || validatedTopics.length === 0) {
        console.error("No valid topics after validation");
        toast({
          title: "No Valid Topics",
          description: "Please add at least one topic with a title. Empty topics will be ignored.",
          variant: "destructive",
        });
        setGenerating(false);
        return;
      }
      
      console.log("Using validated topics for generation:", validatedTopics);
      
      // Generate the timetable with the validated topics
      await generateTimetableWithTopics(validatedTopics);
    } catch (error) {
      console.error("Error in handleGenerateTimetable:", error);
      
      toast({
        title: "Error",
        description: "Failed to generate study planner. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Toggle session completed status
  const toggleSessionCompleted = async (dayIndex: number, sessionIndex: number, currentStatus: boolean) => {
    try {
      // Create a deep copy of the timetable
      const updatedTimetable = JSON.parse(JSON.stringify(timetable));
      
      // Toggle the completed status
      updatedTimetable[dayIndex].sessions[sessionIndex].completed = !currentStatus;
      
      // Update the state immediately for a responsive UI
      setTimetable(updatedTimetable);
      
      // If we have a course ID, update the status on the server
      if (courseId) {
        const day = timetable[dayIndex];
        const session = day.sessions[sessionIndex];
        
        const response = await markSessionCompleted(courseId, dayIndex, sessionIndex, !currentStatus);
        
        if (!response.success) {
          console.error("Failed to update session status on server");
          
          // Revert the change if the server update failed
          updatedTimetable[dayIndex].sessions[sessionIndex].completed = currentStatus;
          setTimetable(updatedTimetable);
          
          toast({
            title: "Error",
            description: "Failed to update session status. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error toggling session completed:", error);
      
      let errorMessage = "Failed to update session status. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-24 px-4 max-w-6xl mx-auto pb-16">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <CalendarClock size={32} className="text-purple-400" />
              Study Planner
            </h1>
            <p className="text-gray-400">
              {subject} ({level})
            </p>
          </div>
          <button
            onClick={() => navigate("/my-courses")}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
          >
            <ArrowLeft size={20} /> Back to Courses
          </button>
        </div>

        {loading || generating ? (
          <div className="flex justify-center items-center h-[60vh]">
            <div className="flex flex-col items-center">
              <Loader2 size={40} className="animate-spin text-purple-500 mb-4" />
              <p className="text-xl">
                {generating ? "Generating your study plan..." : "Loading study plan..."}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
            {/* Study Planner Form */}
            <div className="mb-8 p-6 bg-gray-800 rounded-lg">
              <h3 className="text-xl font-semibold mb-6">Create Your Study Plan</h3>
              
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateChange(e, 'start')}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleDateChange(e, 'end')}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                  />
                </div>
              </div>
              
              {/* Study Topics */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-400">
                    Study Topics <span className="text-red-400">*</span>
                  </label>
                 
                </div>
                <div className="space-y-3">
                  {studyTopics.map((topic, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-grow">
                        <input
                          type="text"
                          value={topic.title}
                          onChange={(e) => handleTopicChange(index, 'title', e.target.value)}
                          placeholder="Enter topic title (required)"
                          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                        />
                      </div>
                      <div className="w-32">
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={topic.hours}
                            min="0.5"
                            step="0.5"
                            onChange={(e) => handleTopicChange(index, 'hours', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                          />
                          <span className="ml-2 text-gray-400">hrs</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTopic(index)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addTopic}
                  className="mt-3 text-purple-400 border-purple-400/30 hover:bg-purple-400/10"
                >
                  <Plus size={16} className="mr-1" /> Add Topic
                </Button>
              </div>
              
              {/* Generate Button */}
              <Button
                onClick={handleGenerateTimetable}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-md"
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>Generate Study Plan</>
                )}
              </Button>
            </div>
            
            {/* Timetable Display */}
            {timetable.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-6">Your Study Plan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {timetable.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="bg-gray-800 p-5 rounded-lg border border-gray-700"
                    >
                      <h4 className="text-lg font-medium text-purple-400 mb-4">
                        {formatDate(day.date)}
                      </h4>
                      <div className="space-y-3">
                        {day.sessions.map((session, sessionIndex) => (
                          <div 
                            key={sessionIndex} 
                            className={`p-3 rounded-md flex items-start gap-3 ${
                              session.isBreak 
                                ? "bg-gray-700/50 border border-gray-600" 
                                : session.completed
                                  ? "bg-green-900/20 border border-green-800/30"
                                  : "bg-purple-900/20 border border-purple-800/30"
                            }`}
                          >
                            <div className={`p-2 rounded-full ${
                              session.isBreak 
                                ? "bg-gray-600" 
                                : session.completed
                                  ? "bg-green-700"
                                  : "bg-purple-700"
                            }`}>
                              {session.isBreak ? (
                                <Coffee size={18} />
                              ) : (
                                <BookOpen size={18} />
                              )}
                            </div>
                            <div className="flex-grow">
                              <div className="flex justify-between items-start">
                                <h5 className={`font-medium ${
                                  session.isBreak 
                                    ? "text-gray-300" 
                                    : session.completed
                                      ? "text-green-300"
                                      : "text-white"
                                }`}>
                                  {session.topic}
                                  {session.completed && !session.isBreak && (
                                    <span className="ml-2 text-xs text-green-400">(Completed)</span>
                                  )}
                                </h5>
                                <div className="flex items-center text-sm text-gray-400">
                                  <Clock size={14} className="mr-1" />
                                  <span>
                                    {formatTimeString(session.startTime)} - {formatTimeString(session.endTime)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-400 mt-1">
                                  {session.isBreak 
                                    ? `${session.duration} min break` 
                                    : `${session.duration / 60} hour${session.duration / 60 !== 1 ? 's' : ''} study session`}
                                </p>
                                {!session.isBreak && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleSessionCompleted(dayIndex, sessionIndex, !!session.completed)}
                                    className={`mt-1 ${
                                      session.completed 
                                        ? "text-green-400 hover:text-green-500" 
                                        : "text-gray-400 hover:text-purple-400"
                                    }`}
                                  >
                                    {session.completed ? (
                                      <CheckCircle size={18} className="mr-1" />
                                    ) : (
                                      <Circle size={18} className="mr-1" />
                                    )}
                                    {session.completed ? "Completed" : "Mark as Done"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetablePage;