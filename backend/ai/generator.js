const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateNotes = async (subject, difficulty) => {
  // Create a more specific prompt with better formatting instructions
  const prompt = `
    You are an expert educator specializing in ${subject}.  
Create a comprehensive course on "${subject}" at a "${difficulty}" level.  

Requirements:  
1. Include exactly 10 well-structured topics.  
2. For each topic:  
   - Provide a clear, descriptive title  
   - Write 3 detailed paragraphs of educational content (each paragraph should contain 4-6 sentences)  
   - Focus on clear, factual information and in-depth explanations  
   - Use simple formatting (only paragraph breaks with \n\n)  
   - DO NOT use code blocks, bullet points, or special characters  

IMPORTANT: Format your response as a valid JSON array with the following structure:  
[  
  {  
    "title": "Topic 1: Specific Title",  
    "notes": "Paragraph 1 with clear and informative content about this topic.\n\nParagraph 2 expanding on important aspects and context.\n\nParagraph 3 with additional explanations, examples, or key insights."  
  },  
  {  
    "title": "Topic 2: Another Specific Title",  
    "notes": "Paragraph 1 about this second topic.\n\nParagraph 2 with more explanation and depth.\n\nParagraph 3 with further clarification or related knowledge."  
  }  
]  

Ensure your response is ONLY the JSON array with no extra text before or after.

  `;
  
  try {
    console.log(`Generating notes for subject: ${subject} at ${difficulty} level`);
    
    // Configure the model with better parameters
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    });
    
    // Make multiple attempts if needed
    let attempts = 0;
    let result;
    
    while (attempts < 3) {
      try {
        console.log(`Attempt ${attempts + 1} to generate content`);
        result = await model.generateContent(prompt);
        break; // If successful, exit the loop
      } catch (genError) {
        attempts++;
        console.error(`Generation attempt ${attempts} failed:`, genError);
        
        if (attempts >= 3) {
          throw new Error("Failed to generate content after multiple attempts");
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    const text = result.response.text();

    console.log("Raw response received from Gemini API");
    
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;
    const jsonText = text.slice(start, end);

    // Check if jsonText is valid JSON
    if (jsonText && jsonText[0] === '[' && jsonText[jsonText.length - 1] === ']') {
      console.log("JSON format detected, attempting to parse...");
      
      try {
        // Try to parse the JSON directly first
        let topics;
        try {
          topics = JSON.parse(jsonText);
          console.log("Successfully parsed JSON directly");
        } catch (parseError) {
          console.error("Error parsing JSON directly:", parseError.message);
          
          // If direct parsing fails, try a more robust approach
          console.log("Attempting to clean and parse JSON...");
          
          // Create a safer version of the JSON by manually extracting topics
          const topicsArray = [];
          const topicRegex = /"title"\s*:\s*"([^"]*)"\s*,\s*"notes"\s*:\s*"([^"]*)"/g;
          let match;
          
          while ((match = topicRegex.exec(jsonText)) !== null) {
            topicsArray.push({
              title: match[1],
              notes: match[2]
            });
          }
          
          if (topicsArray.length > 0) {
            topics = topicsArray;
            console.log(`Successfully extracted ${topics.length} topics using regex`);
          } else {
            // If regex extraction fails, create a fallback topic
            topics = [{
              title: "Introduction to " + subject,
              notes: "This is an introduction to " + subject + " at " + difficulty + " level. More content will be generated soon."
            }];
            console.log("Using fallback topic");
          }
        }
        
        console.log(`Processing ${topics.length} topics`);
        
        // Process each topic to ensure content is properly formatted
        topics = topics.map(topic => {
          try {
            // Clean up the title
            const title = topic.title ? String(topic.title).trim() : "Untitled Topic";
            
            // Get the content from either notes or content field
            let notesContent = topic.notes || topic.content || "";
            
            // Ensure notesContent is a string
            notesContent = String(notesContent);
            
            // Clean up the content - remove excessive newlines and ensure paragraphs
            notesContent = notesContent
              .replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with 2
              .replace(/```[^`]*```/g, "") // Remove code blocks
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
              .trim();
              
            return {
              title: title,
              notes: notesContent,
              content: notesContent // Keep content for backward compatibility
            };
          } catch (err) {
            console.error("Error processing topic:", err);
            return {
              title: "Topic " + (topics.indexOf(topic) + 1),
              notes: "Content for this topic is being prepared.",
              content: "Content for this topic is being prepared."
            };
          }
        });
        
        console.log(`Successfully processed ${topics.length} topics`);
        return { topics };
      } catch (processingError) {
        console.error("Error processing topics:", processingError);
        // Create fallback content
        const fallbackTopics = [
          {
            title: "Introduction to " + subject,
            notes: "This is an introduction to " + subject + " at " + difficulty + " level. More content will be generated soon.",
            content: "This is an introduction to " + subject + " at " + difficulty + " level. More content will be generated soon."
          }
        ];
        return { topics: fallbackTopics };
      }
    } else {
      console.error('Invalid JSON format, creating fallback content');
      // Create fallback content
      const fallbackTopics = [
        {
          title: "Introduction to " + subject,
          notes: "This is an introduction to " + subject + " at " + difficulty + " level. More content will be generated soon.",
          content: "This is an introduction to " + subject + " at " + difficulty + " level. More content will be generated soon."
        }
      ];
      return { topics: fallbackTopics };
    }
  } catch (err) {
    console.error("Gemini Error:", err);
    
    // Create more useful fallback content based on the subject
    const fallbackTopics = [
      {
        title: "Introduction to " + subject,
        notes: `${subject.charAt(0).toUpperCase() + subject.slice(1)} is an important field of study with many practical applications. This introductory topic covers the fundamental concepts and principles that form the foundation of ${subject}.\n\nStudents will learn about the key terminology, historical development, and basic frameworks that are essential for understanding more advanced topics in ${subject}.`,
        content: `${subject.charAt(0).toUpperCase() + subject.slice(1)} is an important field of study with many practical applications. This introductory topic covers the fundamental concepts and principles that form the foundation of ${subject}.\n\nStudents will learn about the key terminology, historical development, and basic frameworks that are essential for understanding more advanced topics in ${subject}.`
      },
      {
        title: "Core Concepts in " + subject,
        notes: `This topic explores the essential concepts that are central to understanding ${subject}. We'll examine the theoretical foundations and practical applications that make ${subject} relevant in today's world.\n\nBy mastering these core concepts, students will develop a framework for analyzing and solving problems related to ${subject}.`,
        content: `This topic explores the essential concepts that are central to understanding ${subject}. We'll examine the theoretical foundations and practical applications that make ${subject} relevant in today's world.\n\nBy mastering these core concepts, students will develop a framework for analyzing and solving problems related to ${subject}.`
      },
      {
        title: "Advanced Topics in " + subject,
        notes: `Building on the foundational knowledge, this section delves into more advanced aspects of ${subject}. Students will explore complex theories and methodologies that are currently shaping this field.\n\nThese advanced topics will challenge students to think critically and apply their knowledge to solve real-world problems in ${subject}.`,
        content: `Building on the foundational knowledge, this section delves into more advanced aspects of ${subject}. Students will explore complex theories and methodologies that are currently shaping this field.\n\nThese advanced topics will challenge students to think critically and apply their knowledge to solve real-world problems in ${subject}.`
      }
    ];
    
    return { topics: fallbackTopics };
  }
}


const generateQuiz = async (topic) => {
  const prompt = `
    You're an expert educator.
    Generate a quiz for the topic: "${topic}".
    Requirements:
    1. Provide 4 multiple-choice quiz questions.
    2. Each question must have 4 options (A, B, C, D) and only 1 correct answer.
    Format your response in **valid JSON**, as shown below:
    [
      {
        "question": "Sample question?",
        "options": ["A", "B", "C", "D"],
        "answer": "A"
      },
      {
        "question": "Second question?",
        "options": ["A", "B", "C", "D"],
        "answer": "C"
      },
      {
        "question": "Third question?",
        "options": ["A", "B", "C", "D"],
        "answer": "D"
      },
      {
        "question": "Fourth question?",
        "options": ["A", "B", "C", "D"],
        "answer": "B"
      }
    ]
  `;
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;
    const jsonText = text.slice(start, end);

    // Check if jsonText is valid JSON
    if (jsonText && jsonText[0] === '[' && jsonText[jsonText.length - 1] === ']') {
      const quiz = JSON.parse(jsonText);
      return { quiz };
    } else {
      console.error('Invalid JSON format:', jsonText);
      throw new Error('Invalid JSON format returned from Gemini.');
    }
  } catch (err) {
    console.error("Gemini Error:", err);
    throw err;
  }
};

const generateTimetable = async (topics, startDate, endDate) => {
  const prompt = `
    You're an expert educator.
    Generate a detailed study timetable for the following topics: "${topics.join(", ")}".
    Requirements:
    1. Distribute the topics evenly across the available days between "${startDate}" and "${endDate}".
    2. Provide the estimated time required for each topic (including study time and breaks).
    3. Suggest study durations for each topic and include break times.
    Format your response in **valid JSON**, as shown below:
    [
      {
        "day": "Day 1",
        "topics": [
          {
            "topic": "Topic 1",
            "study_duration": "1 hour",
            "break_duration": "10 minutes"
          },
          {
            "topic": "Topic 2",
            "study_duration": "1.5 hours",
            "break_duration": "10 minutes"
          }
        ]
      },
      {
        "day": "Day 2",
        "topics": [
          {
            "topic": "Topic 3",
            "study_duration": "1 hour",
            "break_duration": "10 minutes"
          }
        ]
      }
    ]
  `;
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]") + 1;
    const jsonText = text.slice(start, end);

    // Check if jsonText is valid JSON
    if (jsonText && jsonText[0] === '[' && jsonText[jsonText.length - 1] === ']') {
      const timetable = JSON.parse(jsonText);
      return { timetable };
    } else {
      console.error('Invalid JSON format:', jsonText);
      throw new Error('Invalid JSON format returned from Gemini.');
    }
  } catch (err) {
    console.error("Gemini Error:", err);
    throw err;
  }
};

module.exports = {
  generateNotes,
  generateQuiz,
  generateTimetable
};