export const generateNotes = async (subject: string, level: string): Promise<{ notes: string; course: any }> => {
  try {
    console.log("🔍 Generating notes for subject:", subject, "level:", level);
    
    // 🔐 Get the token from localStorage (or however you're storing it)
    let token = localStorage.getItem("token"); // Or from context
    
    // Try to get token from cookie if not in localStorage
    if (!token) {
      console.log("🔍 No token in localStorage, checking cookies");
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
        console.log("✅ Found token in cookies, length:", token.length);
        // Save it back to localStorage
        localStorage.setItem("token", token);
      }
    }

    if (!token) {
      console.error("❌ Authentication Error: No auth token found");
      // Clear any stale user data
      localStorage.removeItem("user");
      // Redirect to login
      window.location.href = "/login";
      throw new Error("You need to be logged in to generate notes. Please log in and try again.");
    }

    // Verify token format
    if (!token || token.length < 100) {
      console.error("❌ Token appears to be invalid (too short):", token ? token.length : "no token");
      
      // Try to get a test token
      try {
        console.log("🔍 Attempting to get a test token");
        const response = await fetch("http://localhost:5000/api/auth/generate-test-token");
        
        if (!response.ok) {
          throw new Error(`Failed to get test token: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("✅ Test token response:", data);
        
        if (data.token && data.token.length > 100) {
          console.log("✅ Got valid test token, length:", data.token.length);
          localStorage.setItem("token", data.token);
          token = data.token;
          console.log("✅ Token updated in localStorage");
        } else {
          throw new Error("Failed to get valid token from server");
        }
      } catch (e) {
        console.error("❌ Failed to get test token:", e);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        alert("Your session has expired. Please log in again.");
        window.location.href = "/login";
        throw new Error("Your session appears to be invalid. Please log in again.");
      }
    }

    console.log("🔍 Making API request with token:", token ? "Yes (length: " + token.length + ")" : "No");
    
    const res = await fetch("http://localhost:5000/api/course/generate", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, // 👈 Add the JWT here
      },
      body: JSON.stringify({ subject, level }),
    });

    console.log("🔍 API response status:", res.status);
    
    if (!res.ok) {
      let errorMessage = "Failed to generate notes";
      
      try {
        const errorText = await res.text();
        console.error("❌ Server Error:", errorText);
        
        // Try to parse as JSON
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
          // Not JSON, use as is
          if (errorText) errorMessage = errorText;
        }
      } catch (e) {
        console.error("❌ Could not read error response:", e);
      }
      
      // Check if it's an authentication error
      if (res.status === 401 || res.status === 403) {
        console.error("❌ Authentication error:", res.status);
        // Clear all auth data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
        throw new Error("Your session has expired. Please log in again.");
      }
      
      // For server errors, provide a more specific message
      if (res.status === 500) {
        console.error("❌ Server error:", res.status);
        throw new Error("The server encountered an error. This might be due to invalid characters in the subject or complexity of the request. Please try again with a simpler subject.");
      }
      
      throw new Error(errorMessage);
    }

    const data = await res.json();
    console.log("✅ API Response Data:", JSON.stringify(data, null, 2));
    
    // Check if data has the expected structure
    if (!data?.course?.topics) {
      console.error("❌ Unexpected API response format:", data);
      return {
        notes: "Error: Unexpected API response format. Please try again.",
        course: null
      };
    }
    
    // Store the course ID for reference
    const courseId = data.course._id;
    console.log("✅ Generated course ID:", courseId);
    
    // Map the topics to the expected format
    const formattedNotes = data.course.topics.map((topic: any) => {
      console.log("🔍 Processing topic:", topic.title);
      
      // Check which field contains the notes content
      let notesContent = "";
      
      if (topic.notes) {
        console.log("✅ Found notes field with length:", topic.notes.length);
        notesContent = topic.notes;
      } else if (topic.content) {
        console.log("✅ Found content field with length:", topic.content.length);
        notesContent = topic.content;
      } else {
        console.log("❌ No notes or content field found");
        notesContent = "Content for this topic is being prepared.";
      }
      
      // Clean up the content
      notesContent = notesContent
        .replace(/```[^`]*```/g, "") // Remove code blocks
        .replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with 2
        .trim();
      
      // Format with title on its own line, then content
      return `${topic.title}:\n${notesContent}`;
    }).join("\n\n");
    
    console.log("✅ Formatted notes created, length:", formattedNotes.length);
    
    // Return both the formatted notes and the course data
    return {
      notes: formattedNotes || "No notes found.",
      course: data.course
    };
  } catch (err) {
    console.error("❌ Error in generateNotes:", err);
    throw err; // Re-throw to handle in the component
  }
};

// Quiz Types
export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface Quiz {
  id: string;
  topic: string;
  level?: string;
  questions: QuizQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  results: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
}

// Generate a quiz for a topic
export const generateQuiz = async (topic: string, level?: string, courseId?: string): Promise<Quiz> => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You need to be logged in to generate a quiz. Please log in and try again.');
  }

  try {
    console.log(`🔍 Generating quiz for topic: ${topic}, level: ${level || 'not specified'}`);
    
    const res = await fetch('http://localhost:5000/api/quiz/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        topic,
        level,
        courseId: courseId || undefined
      }),
    });

    console.log("🔍 Quiz API response status:", res.status);
    
    if (!res.ok) {
      let errorMessage = "Failed to generate quiz";
      
      try {
        const errorText = await res.text();
        console.error("❌ Quiz API Error:", errorText);
        
        // Try to parse as JSON
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
          // Not JSON, use as is
          if (errorText) errorMessage = errorText;
        }
      } catch (e) {
        console.error("❌ Could not read error response:", e);
      }
      
      throw new Error(errorMessage);
    }

    const data = await res.json();
    console.log("✅ Quiz generated successfully:", data);
    
    return data.quiz;
  } catch (err) {
    console.error("❌ Error in generateQuiz:", err);
    throw err;
  }
};

// Get all quizzes for the current user
export const getQuizzes = async (): Promise<Quiz[]> => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You need to be logged in to view quizzes. Please log in and try again.');
  }

  try {
    const res = await fetch('http://localhost:5000/api/quiz', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch quizzes');
    }

    const data = await res.json();
    return data.quizzes || [];
  } catch (err) {
    console.error("❌ Error in getQuizzes:", err);
    // Return empty array on error to avoid breaking the UI
    return [];
  }
};

// Get a specific quiz by ID
export const getQuiz = async (quizId: string): Promise<Quiz> => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You need to be logged in to view a quiz. Please log in and try again.');
  }

  try {
    const res = await fetch(`http://localhost:5000/api/quiz/${quizId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch quiz');
    }

    const data = await res.json();
    return data.quiz;
  } catch (err) {
    console.error("❌ Error in getQuiz:", err);
    throw err;
  }
};

// Submit quiz answers and get results
export const submitQuiz = async (quizId: string, answers: string[]): Promise<QuizResult> => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You need to be logged in to submit a quiz. Please log in and try again.');
  }

  try {
    const res = await fetch(`http://localhost:5000/api/quiz/${quizId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ answers }),
    });

    if (!res.ok) {
      throw new Error('Failed to submit quiz');
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("❌ Error in submitQuiz:", err);
    throw err;
  }
};

// Send a message to the chatbot API
export const sendChatMessage = async (message: string): Promise<string> => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You need to be logged in to use the chatbot. Please log in and try again.');
  }

  // Verify token format
  if (!token || token.length < 100) {
    console.error("❌ Token appears to be invalid (too short):", token ? token.length : "no token");
    throw new Error('Your session appears to be invalid. Please log in again.');
  }

  try {
    console.log("🔍 Sending message to chatbot API:", message);
    
    const res = await fetch('http://localhost:5000/api/chatbot/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    console.log("🔍 Chatbot API response status:", res.status);
    
    if (!res.ok) {
      let errorMessage = "Failed to get response from chatbot";
      
      try {
        const errorText = await res.text();
        console.error("❌ Chatbot API Error:", errorText);
        
        // Try to parse as JSON
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
          // Not JSON, use as is
          if (errorText) errorMessage = errorText;
        }
      } catch (e) {
        console.error("❌ Could not read error response:", e);
      }
      
      // Check if it's an authentication error
      if (res.status === 401 || res.status === 403) {
        console.error("❌ Authentication error:", res.status);
        throw new Error("Your session has expired. Please log in again.");
      }
      
      throw new Error(errorMessage);
    }

    const data = await res.json();
    console.log("✅ Chatbot API Response:", data);
    
    return data.message || "Sorry, I couldn't generate a response.";
  } catch (err) {
    console.error("❌ Error in sendChatMessage:", err);
    throw err;
  }
};
