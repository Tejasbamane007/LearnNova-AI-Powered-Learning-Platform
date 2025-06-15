import apiRequest from './api';

export interface UserProfile {
  name: string;
  email: string;
  gamification: {
    xp: number;
    streak: number;
    badges: string[];
  };
  progress: {
    courseId: string;
    completedTopics: {
      topicId: string;
      completedAt: string;
    }[];
  }[];
  lastProgressDate: string;
}

// Get user profile
export const getUserProfile = async () => {
  return apiRequest('/auth/profile');
};

// Get user gamification data
export const getUserGamification = async () => {
  return apiRequest('/auth/gamification');
};

// Get user progress across all courses
export const getUserProgress = async () => {
  return apiRequest('/course/progress');
};

// Update user profile
export const updateUserProfile = async (name: string, email: string) => {
  return apiRequest('/auth/profile', 'PUT', { name, email });
};

// Change user password
export const changePassword = async (currentPassword: string, newPassword: string) => {
  return apiRequest('/auth/change-password', 'PUT', { currentPassword, newPassword });
};