import apiRequest from './api';

export interface Course {
  _id: string;
  subject: string;
  difficulty: string;
  topics: Topic[];
  progress: {
    completedTopics: number;
    totalTopics: number;
    testScores: {
      topic: string;
      score: number;
      date: string;
    }[];
  };
  createdAt: string;
  hasQuiz?: boolean;
  hasTimetable?: boolean;
  hasPdfNotes?: boolean;
  pdfNotes?: {
    _id: string;
    fileName: string;
    notes: string;
    createdAt: string;
  }[];
}

export interface Topic {
  _id: string;
  title: string;
  content: string;
  notes: string;
  quiz?: any[];
  estimatedHours?: number;
  status: 'pending' | 'in-progress' | 'completed';
}

// Get all courses for the current user
export const getMyCourses = async () => {
  return apiRequest('/course/my-courses');
};

// Get a single course by ID
export const getCourseById = async (courseId: string) => {
  return apiRequest(`/course/my-courses?courseId=${courseId}`);
};

// Generate a new course
export const generateCourse = async (subject: string, difficulty: string) => {
  return apiRequest('/course/generate', 'POST', { subject, difficulty });
};

// Get course progress
export const getCourseProgress = async (courseId: string) => {
  return apiRequest(`/course/progress/${courseId}`);
};

// Mark a topic as completed
export const markTopicCompleted = async (topicId: string, courseId: string) => {
  return apiRequest(`/course/topic/${topicId}/progress/${courseId}`, 'POST');
};

// Reset course progress
export const resetCourseProgress = async (courseId: string) => {
  return apiRequest(`/course/progress/reset/${courseId}`, 'POST');
};

// Save notes for a topic
export const saveTopicNotes = async (courseId: string, topicId: string, content: string) => {
  return apiRequest(`/course/notes/${courseId}/${topicId}`, 'POST', { content });
};

// Generate study planner for a course
export const generateTimetable = async (courseId: string, data: { 
  startDate: string, 
  endDate: string, 
  topics: { title: string, hours: number }[] 
}) => {
  const { startDate, endDate, topics } = data;
  console.log("Generating timetable with:", { courseId, startDate, endDate, topics });
  
  // Validate topics before sending to API
  const validatedTopics = topics && Array.isArray(topics) ? topics.map(topic => ({
    title: topic.title || `Topic ${Math.random().toString(36).substring(7)}`, // Ensure title exists
    hours: topic.hours <= 0 ? 1 : topic.hours // Ensure minimum 1 hour per topic
  })) : [];
  
  console.log("Sending validated topics to API:", validatedTopics);
  
  try {
    // Make sure we have valid topics to send to API
    const topicsToSend = validatedTopics && Array.isArray(validatedTopics) 
      ? validatedTopics 
      : [];
    
    if (topicsToSend.length === 0) {
      console.error('Error: No valid topics to send to API');
    }
    
    // Try the API call with flag to update the course
    const response = await apiRequest(`/timetable/${courseId}`, 'POST', { 
      startDate, 
      endDate, 
      topics: topicsToSend,
      updateCourse: true // Flag to update the course's hasTimetable field
    }, 60000); // Use a 60-second timeout for timetable generation
    
    // If successful, update the course to mark that it has a timetable
    try {
      await updateCourseFlags(courseId, { hasTimetable: true });
      console.log("Updated course to mark timetable as generated");
    } catch (updateError) {
      console.error("Failed to update course flags:", updateError);
      // Don't throw an error here, just log it
      // The timetable is still saved even if we can't update the flag
    }
    
    return response;
  } catch (error) {
    console.error('Error generating timetable:', error);
    // Let the component handle the error and generate a fallback timetable
    throw error;
  }
};

// Mark a study session as completed
export const markSessionCompleted = async (courseId: string, dateIndex: number, sessionIndex: number, completed: boolean) => {
  return apiRequest(`/timetable/${courseId}/${dateIndex}/${sessionIndex}`, 'PATCH', { completed });
};

// Get timetable for a course
export const getCourseTimetable = async (courseId: string) => {
  return apiRequest(`/timetable/${courseId}`);
};

// Delete a course
export const deleteCourse = async (courseId: string) => {
  return apiRequest(`/course/${courseId}`, 'DELETE');
};

// Update course flags (hasTimetable, hasQuiz, hasPdfNotes)
export const updateCourseFlags = async (courseId: string, flags: { hasTimetable?: boolean, hasQuiz?: boolean, hasPdfNotes?: boolean }) => {
  return apiRequest(`/course/${courseId}/update-flags`, 'PATCH', flags);
};