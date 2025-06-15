const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini API client if API key is available
let genAI;
let geminiModel;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-2.0-flash-lite as specified
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    console.log('✅ Gemini API initialized successfully');
  } else {
    console.warn('⚠️ Gemini API key not found. Using mock data instead.');
  }
} catch (error) {
  console.error('❌ Error initializing Gemini API client:', error);
}

// Generate quiz questions for a subject
exports.generateQuizQuestions = async (subject, level = 'intermediate', count = 10) => {
  try {
    console.log(`Generating ${count} quiz questions for ${subject} at ${level} level`);
    
    // Create subject-specific quiz questions based on the subject
    let questions = [];
    
    // Map of predefined questions for common subjects
    const subjectQuestions = {
      'networks': [
        {
          question: "Which protocol is used for secure communication over a computer network?",
          options: ["HTTP", "FTP", "HTTPS", "SMTP"],
          answer: "HTTPS"
        },
        {
          question: "What does IP stand for in IP address?",
          options: ["Internet Protocol", "Internet Provider", "Internal Protocol", "Internet Port"],
          answer: "Internet Protocol"
        },
        {
          question: "Which network topology connects each device to a central hub?",
          options: ["Star", "Ring", "Bus", "Mesh"],
          answer: "Star"
        },
        {
          question: "What is the maximum number of IP addresses available in IPv4?",
          options: ["4.3 billion", "16 million", "1 trillion", "256 million"],
          answer: "4.3 billion"
        },
        {
          question: "Which layer of the OSI model is responsible for routing?",
          options: ["Network Layer", "Transport Layer", "Data Link Layer", "Physical Layer"],
          answer: "Network Layer"
        },
        {
          question: "What does DNS stand for?",
          options: ["Domain Name System", "Digital Network Service", "Data Network Standard", "Dynamic Name Server"],
          answer: "Domain Name System"
        },
        {
          question: "Which protocol is used for sending emails?",
          options: ["SMTP", "POP3", "IMAP", "HTTP"],
          answer: "SMTP"
        },
        {
          question: "What is the purpose of a subnet mask?",
          options: ["To identify the network portion of an IP address", "To encrypt data", "To block unwanted traffic", "To increase network speed"],
          answer: "To identify the network portion of an IP address"
        },
        {
          question: "Which device connects different networks together?",
          options: ["Router", "Hub", "Switch", "Repeater"],
          answer: "Router"
        },
        {
          question: "What is the default port number for HTTP?",
          options: ["80", "443", "21", "25"],
          answer: "80"
        },
        {
          question: "Which protocol provides reliable data transmission?",
          options: ["TCP", "UDP", "ICMP", "ARP"],
          answer: "TCP"
        },
        {
          question: "What is a firewall used for?",
          options: ["Network security", "Data compression", "File sharing", "Video streaming"],
          answer: "Network security"
        },
        {
          question: "Which wireless standard operates at 2.4 GHz and 5 GHz frequencies?",
          options: ["802.11n", "802.11a", "802.11b", "802.3"],
          answer: "802.11n"
        },
        {
          question: "What is the purpose of DHCP?",
          options: ["Automatically assign IP addresses", "Encrypt network traffic", "Filter content", "Manage bandwidth"],
          answer: "Automatically assign IP addresses"
        },
        {
          question: "Which network device operates at the Data Link layer?",
          options: ["Switch", "Router", "Gateway", "Firewall"],
          answer: "Switch"
        }
      ],
      'programming': [
        {
          question: "Which data structure uses LIFO (Last In, First Out) principle?",
          options: ["Stack", "Queue", "Linked List", "Tree"],
          answer: "Stack"
        },
        {
          question: "What does OOP stand for?",
          options: ["Object-Oriented Programming", "Ordered Output Processing", "Object Output Program", "Oriented Object Protocol"],
          answer: "Object-Oriented Programming"
        },
        {
          question: "Which sorting algorithm has the best average-case time complexity?",
          options: ["Quick Sort", "Bubble Sort", "Selection Sort", "Insertion Sort"],
          answer: "Quick Sort"
        },
        {
          question: "What is the time complexity of binary search?",
          options: ["O(log n)", "O(n)", "O(n²)", "O(1)"],
          answer: "O(log n)"
        },
        {
          question: "Which of these is not a programming paradigm?",
          options: ["Reflective Programming", "Procedural Programming", "Functional Programming", "Object-Oriented Programming"],
          answer: "Reflective Programming"
        },
        {
          question: "What does API stand for?",
          options: ["Application Programming Interface", "Application Protocol Interface", "Advanced Programming Interface", "Application Process Integration"],
          answer: "Application Programming Interface"
        },
        {
          question: "Which of these is not a high-level programming language?",
          options: ["Assembly", "Python", "Java", "JavaScript"],
          answer: "Assembly"
        },
        {
          question: "What is recursion in programming?",
          options: ["A function that calls itself", "A loop that never ends", "A variable that changes type", "A method to optimize code"],
          answer: "A function that calls itself"
        },
        {
          question: "Which data structure is best for implementing a dictionary?",
          options: ["Hash Table", "Array", "Linked List", "Stack"],
          answer: "Hash Table"
        },
        {
          question: "What is the purpose of a constructor in OOP?",
          options: ["Initialize an object", "Destroy an object", "Copy an object", "Compare objects"],
          answer: "Initialize an object"
        },
        {
          question: "Which of these is not a principle of OOP?",
          options: ["Standardization", "Encapsulation", "Inheritance", "Polymorphism"],
          answer: "Standardization"
        },
        {
          question: "What is a memory leak?",
          options: ["Memory that is not freed after use", "Memory that is corrupted", "Memory that is too slow", "Memory that is encrypted"],
          answer: "Memory that is not freed after use"
        },
        {
          question: "Which of these is a dynamic programming language?",
          options: ["JavaScript", "C", "Pascal", "FORTRAN"],
          answer: "JavaScript"
        },
        {
          question: "What is the purpose of version control systems?",
          options: ["Track changes in source code", "Optimize code execution", "Debug applications", "Compile source code"],
          answer: "Track changes in source code"
        },
        {
          question: "Which design pattern is used to create objects without specifying their concrete classes?",
          options: ["Factory Method", "Singleton", "Observer", "Decorator"],
          answer: "Factory Method"
        }
      ]
    };
    
    // Check if we have predefined questions for this subject
    const lowerSubject = subject.toLowerCase();
    let subjectKey = Object.keys(subjectQuestions).find(key => 
      lowerSubject.includes(key) || key.includes(lowerSubject)
    );
    
    if (subjectKey && subjectQuestions[subjectKey].length >= count) {
      // Use predefined questions for this subject
      console.log(`Using predefined questions for ${subjectKey}`);
      questions = subjectQuestions[subjectKey].slice(0, count);
    } else {
      // Generate generic questions based on the subject
      console.log(`Generating generic questions for ${subject}`);
      
      // Define question templates
      const questionTemplates = [
        `What is the main purpose of ${subject}?`,
        `Which of these is NOT related to ${subject}?`,
        `Who is considered the founder of modern ${subject}?`,
        `When did ${subject} first emerge as a field of study?`,
        `Which concept is most fundamental to ${subject}?`,
        `What is a common application of ${subject}?`,
        `Which technology is most closely associated with ${subject}?`,
        `What is the relationship between ${subject} and data analysis?`,
        `Which of these tools is most commonly used in ${subject}?`,
        `What is the future direction of ${subject}?`,
        `Which of these is a key principle in ${subject}?`,
        `What challenge is most significant in the field of ${subject}?`,
        `How has ${subject} evolved in the past decade?`,
        `Which industry benefits most from advances in ${subject}?`,
        `What skill is most important for professionals in ${subject}?`
      ];
      
      // Use Gemini to generate meaningful questions and options
      if (geminiModel) {
        try {
          console.log(`Using Gemini to generate questions for ${subject}`);
          
          const prompt = `
            Generate ${count} multiple-choice questions about ${subject} at ${level} difficulty level.
            
            For each question:
            1. Create a clear, specific question about ${subject}
            2. Provide 4 distinct answer options (labeled A, B, C, D)
            3. Indicate which option is correct
            
            Format your response as a valid JSON array of objects with this structure:
            [
              {
                "question": "What is the main purpose of DevOps?",
                "options": [
                  "To automate software delivery and infrastructure changes",
                  "To develop mobile applications exclusively",
                  "To replace traditional programming languages",
                  "To eliminate the need for software testing"
                ],
                "answer": "To automate software delivery and infrastructure changes"
              }
            ]
            
            Important:
            - Make each option a complete, meaningful statement (not just "Option A", etc.)
            - Ensure options are realistic and plausible
            - Make sure the correct answer is clearly better than the alternatives
            - Focus on factual, educational content about ${subject}
            - Return ONLY the JSON array with no additional text
          `;
          
          const result = await geminiModel.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          // Extract JSON from the response
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            try {
              const generatedQuestions = JSON.parse(jsonStr);
              if (Array.isArray(generatedQuestions) && generatedQuestions.length > 0) {
                console.log(`Successfully generated ${generatedQuestions.length} questions with Gemini`);
                return generatedQuestions.slice(0, count);
              }
            } catch (parseError) {
              console.error('Error parsing Gemini response:', parseError);
            }
          }
        } catch (geminiError) {
          console.error('Error using Gemini for question generation:', geminiError);
        }
      }
      
      // Fallback to template-based questions if Gemini fails
      console.log('Falling back to template-based questions');
      for (let i = 0; i < count; i++) {
        const questionIndex = i % questionTemplates.length;
        const question = questionTemplates[questionIndex];
        
        // More meaningful generic options based on the question
        let options;
        let answer;
        
        if (question.includes("main purpose")) {
          options = [
            `To improve understanding and application of ${subject} concepts`,
            `To create theoretical frameworks without practical applications`,
            `To replace traditional methods entirely`,
            `To complicate existing systems with new terminology`
          ];
          answer = `To improve understanding and application of ${subject} concepts`;
        } 
        else if (question.includes("NOT related")) {
          options = [
            `Quantum physics`,
            `Data analysis`,
            `Problem solving`,
            `Critical thinking`
          ];
          answer = `Quantum physics`;
        }
        else if (question.includes("founder")) {
          options = [
            `Alan Turing`,
            `Albert Einstein`,
            `Isaac Newton`,
            `Leonardo da Vinci`
          ];
          answer = `Alan Turing`;
        }
        else if (question.includes("emerge")) {
          options = [
            `In the 1950s`,
            `In the 1980s`,
            `In the early 2000s`,
            `In ancient Greece`
          ];
          answer = `In the 1950s`;
        }
        else if (question.includes("concept")) {
          options = [
            `Systematic problem solving`,
            `Memorization of facts`,
            `Avoiding documentation`,
            `Working in isolation`
          ];
          answer = `Systematic problem solving`;
        }
        else {
          options = [
            `A comprehensive approach to understanding ${subject}`,
            `A narrow focus on theoretical aspects only`,
            `An outdated methodology no longer in use`,
            `A system primarily used in unrelated fields`
          ];
          answer = `A comprehensive approach to understanding ${subject}`;
        }
        
        questions.push({
          question,
          options,
          answer
        });
      }
    }
    
    // Adjust difficulty if needed
    if (level === 'advanced' && questions.length > count) {
      // For advanced, take questions from the end (presumably more difficult)
      questions = questions.slice(questions.length - count);
    } else if (level === 'beginner' && questions.length > count) {
      // For beginner, take questions from the beginning (presumably easier)
      questions = questions.slice(0, count);
    }
    
    console.log(`Generated ${questions.length} questions for ${subject}`);
    
    // Ensure each question has the correct format
    const formattedQuestions = questions.map(q => {
      // Make sure options are strings, not objects or arrays
      const options = q.options.map(opt => 
        typeof opt === 'string' ? opt : JSON.stringify(opt)
      );
      
      // Make sure the answer is one of the options
      let answer = q.answer;
      if (!options.includes(answer)) {
        answer = options[0];
      }
      
      return {
        question: q.question,
        options,
        answer
      };
    });
    
    return formattedQuestions;
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    
    // Fallback to very basic questions if there's an error
    const questions = [];
    for (let i = 1; i <= count; i++) {
      questions.push({
        question: `Question ${i} about ${subject}?`,
        options: [
          `Option A for question ${i}`,
          `Option B for question ${i}`,
          `Option C for question ${i}`,
          `Option D for question ${i}`
        ],
        answer: `Option A for question ${i}`
      });
    }
    return questions;
  }
};

// Generate a timetable for a course
exports.generateTimetableForCourse = async (course, startDate, endDate) => {
  try {
    // Get topics from the course
    const topics = course.topics || [];
    
    // If no topics, generate some mock topics
    const topicTitles = topics.length > 0 
      ? topics.map(topic => topic.title) 
      : [
          'Introduction to the Subject',
          'Basic Concepts',
          'Advanced Topics - Part 1',
          'Advanced Topics - Part 2',
          'Practical Applications',
          'Case Studies',
          'Review Session'
        ];
    
    // If Gemini API is available, use it to generate a timetable
    if (geminiModel) {
      const prompt = `
      You are a helpful assistant that generates study timetables. 
      Generate a timetable for a course on ${course.subject} at ${course.difficulty} level, from ${startDate} to ${endDate}. 
      The course has the following topics: ${topicTitles.join(', ')}. 
      
      Format your response as a JSON array of objects, each with 'date' (YYYY-MM-DD), 'topic', and 'duration' fields.
      
      Example format:
      [
        {
          "date": "2023-05-01",
          "topic": "Introduction to the Subject",
          "duration": "1 hour"
        }
      ]
      
      Important rules:
      1. Skip weekends (Saturday and Sunday)
      2. Distribute topics evenly across the date range
      3. Alternate durations between 1 and 1.5 hours
      4. Make sure all dates are between ${startDate} and ${endDate}
      5. Return only the JSON array, no additional text
      
      Generate a timetable for my ${course.subject} course from ${startDate} to ${endDate}.
      `;

      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const timetable = JSON.parse(jsonStr);
        return timetable;
      }
    }
    
    // Fallback to algorithm-based timetable if Gemini API is not available or fails
    console.log('Using algorithm-based timetable generation');
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timetableEntries = [];
    
    // Calculate days between start and end dates
    const daysBetween = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Distribute topics evenly across the date range
    const topicsCount = topicTitles.length;
    const daysPerTopic = Math.floor(daysBetween / topicsCount);
    
    for (let i = 0; i < topicsCount; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i * daysPerTopic);
      
      // Skip weekends (Saturday and Sunday)
      if (date.getDay() === 0) { // Sunday
        date.setDate(date.getDate() + 1);
      } else if (date.getDay() === 6) { // Saturday
        date.setDate(date.getDate() + 2);
      }
      
      if (date <= end) {
        timetableEntries.push({
          date: date.toISOString().split('T')[0],
          topic: topicTitles[i],
          duration: `${1 + (i % 2) * 0.5} hours`, // Alternate between 1 and 1.5 hours
        });
      }
    }
    
    return timetableEntries;
  } catch (error) {
    console.error('Error generating timetable:', error);
    
    // Fallback to a simple timetable if there's an error
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timetableEntries = [];
    
    // Get topics from the course
    const topics = course.topics || [];
    
    // If no topics, generate some mock topics
    const topicTitles = topics.length > 0 
      ? topics.map(topic => topic.title) 
      : [
          'Introduction to the Subject',
          'Basic Concepts',
          'Advanced Topics - Part 1',
          'Advanced Topics - Part 2',
          'Practical Applications',
          'Case Studies',
          'Review Session'
        ];
    
    // Create a simple timetable with one topic per week
    for (let i = 0; i < topicTitles.length; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i * 7); // One topic per week
      
      if (date <= end) {
        timetableEntries.push({
          date: date.toISOString().split('T')[0],
          topic: topicTitles[i],
          duration: "1 hour",
        });
      }
    }
    
    return timetableEntries;
  }
};

// Generate notes from a PDF file
exports.generateNotesFromPdf = async (pdfContent, subject, level) => {
  try {
    // If Gemini API is available, use it to generate notes
    if (geminiModel) {
      const prompt = `
      You are an expert educational content creator that generates highly structured and visually appealing study notes from PDF content.
      Generate comprehensive notes for a ${subject} course at ${level} level based on the following PDF content.
      Format your response in Markdown with clear hierarchical headings, bullet points, numbered lists, tables, and code examples if relevant.
      
      PDF Content:
      ${pdfContent}
      
      Please structure the notes with the following elements:
      
      1. **Title and Overview**:
         - A clear, descriptive title
         - A concise overview of the topic (2-3 sentences)
      
      2. **Table of Contents**:
         - A structured list of all major sections with links
      
      3. **Introduction**:
         - Context and importance of the topic
         - Historical background if relevant
         - Scope of the notes
      
      4. **Core Concepts**:
         - Each concept in its own section with clear headings (H2)
         - Sub-concepts organized under H3 headings
         - Definitions in blockquotes or highlighted format
         - Visual separation between concepts
      
      5. **Detailed Explanations**:
         - Step-by-step breakdowns of complex ideas
         - Examples with clear labels
         - Comparisons in table format where appropriate
         - Mathematical formulas properly formatted
      
      6. **Visual Organization**:
         - Use of horizontal rules (---) to separate major sections
         - Consistent formatting for similar elements
         - Indentation for hierarchical information
         - Bold text for key terms
      
      7. **Summary and Key Takeaways**:
         - Bulleted list of the most important points
         - Connections between concepts
      
      8. **Additional Resources**:
         - Organized by type (books, articles, videos, etc.)
         - Brief description of each resource
      
      For Neural Networks specifically, include these specialized sections:
      - Mathematical foundations
      - Network architectures with diagrams described in text
      - Training algorithms
      - Practical applications
      - Common challenges and solutions
      
      Make the notes visually scannable with clear hierarchical structure and consistent formatting.
      `;

      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    }
    
    // Fallback to mock notes if Gemini API is not available
    console.log('Using mock notes generation');
    return `# Neural Networks: Intermediate Level Study Notes

## Table of Contents
- [Introduction](#introduction)
- [Mathematical Foundations](#mathematical-foundations)
- [Neural Network Architectures](#neural-network-architectures)
- [Training Algorithms](#training-algorithms)
- [Advanced Techniques](#advanced-techniques)
- [Practical Applications](#practical-applications)
- [Common Challenges and Solutions](#common-challenges-and-solutions)
- [Key Takeaways](#key-takeaways)
- [Additional Resources](#additional-resources)

---

## Introduction

Neural networks are computational models inspired by the human brain's structure and function. At the intermediate level, we explore more complex architectures, training methodologies, and applications beyond the basics. These notes build upon foundational knowledge to provide a comprehensive understanding of both theoretical concepts and practical implementations.

The field of neural networks has evolved significantly since its inception, with major breakthroughs occurring in the last decade due to increased computational power, larger datasets, and algorithmic innovations. This document focuses on current methodologies while acknowledging the historical context that shaped them.

---

## Mathematical Foundations

### Linear Algebra Essentials

> **Definition**: The mathematical backbone of neural networks involves vectors, matrices, and tensor operations that enable efficient computation and representation of complex data.

Key components include:

- **Vectors**: Ordered arrays of numbers representing points in space
- **Matrices**: 2D arrays enabling linear transformations
- **Tensors**: Multi-dimensional arrays generalizing vectors and matrices

### Calculus for Optimization

Neural network training relies heavily on:

1. **Partial Derivatives**: Measuring rate of change with respect to specific variables
2. **Gradient Descent**: Finding minima of functions through iterative steps
3. **Chain Rule**: Computing derivatives of composite functions, essential for backpropagation

### Probability and Statistics

| Concept | Role in Neural Networks |
|---------|-------------------------|
| Probability Distributions | Model uncertainty and generate diverse outputs |
| Statistical Inference | Evaluate model performance and generalization |
| Information Theory | Measure information content and design loss functions |

---

## Neural Network Architectures

### Feedforward Networks

The classic architecture where information flows in one direction:

- **Single Layer Perceptron**: Limited to linearly separable problems
- **Multi-Layer Perceptron (MLP)**: Can approximate any continuous function
- **Deep Feedforward Networks**: Multiple hidden layers enabling hierarchical feature learning

### Convolutional Neural Networks (CNNs)

Specialized for processing grid-like data such as images:

1. **Convolutional Layers**: Apply filters to detect local patterns
2. **Pooling Layers**: Reduce dimensionality while preserving important features
3. **Fully Connected Layers**: Combine features for final classification

### Recurrent Neural Networks (RNNs)

Designed for sequential data processing:

- **Simple RNNs**: Basic feedback connections
- **LSTM (Long Short-Term Memory)**: Solves vanishing gradient problem
- **GRU (Gated Recurrent Unit)**: Simplified LSTM with comparable performance
- **Bidirectional RNNs**: Process sequences in both directions

### Transformer Architectures

> **Definition**: Self-attention based models that have revolutionized natural language processing and beyond.

Key components:
- **Self-Attention Mechanism**: Weighs the importance of different parts of the input
- **Multi-Head Attention**: Parallel attention processes capturing different relationships
- **Positional Encoding**: Preserves sequence order information

---

## Training Algorithms

### Backpropagation in Detail

The fundamental algorithm for neural network training:

1. **Forward Pass**: Compute predictions and loss
2. **Backward Pass**: Compute gradients of parameters with respect to loss
3. **Parameter Update**: Adjust weights and biases to minimize loss

### Optimization Algorithms

| Algorithm | Characteristics | Best Use Cases |
|-----------|-----------------|----------------|
| SGD | Simple, noisy updates | Small datasets, online learning |
| Adam | Adaptive learning rates, momentum | Most practical applications |
| RMSProp | Adapts to feature importance | Recurrent networks |
| LBFGS | Second-order method | Smaller networks, offline training |

### Regularization Techniques

Methods to prevent overfitting:

- **L1/L2 Regularization**: Penalize large weights
- **Dropout**: Randomly deactivate neurons during training
- **Batch Normalization**: Normalize layer inputs, stabilizing training
- **Early Stopping**: Halt training when validation performance degrades

---

## Advanced Techniques

### Transfer Learning

Leveraging pre-trained models:

1. **Feature Extraction**: Use frozen pre-trained layers as feature extractors
2. **Fine-Tuning**: Adapt pre-trained models to new tasks by updating some or all weights
3. **Domain Adaptation**: Adjust models to work with different data distributions

### Generative Models

- **Variational Autoencoders (VAEs)**: Encode data into a probabilistic latent space
- **Generative Adversarial Networks (GANs)**: Generator and discriminator networks competing
- **Diffusion Models**: Gradually add and remove noise to generate high-quality samples

### Reinforcement Learning with Neural Networks

Combining neural networks with reinforcement learning:

- **Deep Q-Networks (DQN)**: Value-based approach for discrete action spaces
- **Policy Gradients**: Directly optimize policy for continuous action spaces
- **Actor-Critic Methods**: Combine value and policy approaches

---

## Practical Applications

### Computer Vision

- **Image Classification**: Identifying objects in images
- **Object Detection**: Locating and classifying multiple objects
- **Semantic Segmentation**: Pixel-level classification
- **Image Generation**: Creating new images with GANs or diffusion models

### Natural Language Processing

- **Text Classification**: Sentiment analysis, topic categorization
- **Machine Translation**: Converting text between languages
- **Question Answering**: Extracting answers from context
- **Text Generation**: Creating human-like text

### Time Series Analysis

Applications in:
- Financial forecasting
- Weather prediction
- Anomaly detection
- Sensor data processing

---

## Common Challenges and Solutions

### Vanishing and Exploding Gradients

**Problem**: Gradients becoming too small or too large during backpropagation

**Solutions**:
- Proper weight initialization (Xavier, He)
- Activation functions (ReLU, Leaky ReLU)
- Gradient clipping
- Residual connections

### Overfitting

**Problem**: Model performs well on training data but poorly on unseen data

**Solutions**:
- More training data
- Data augmentation
- Regularization techniques
- Simpler model architecture

### Computational Efficiency

**Problem**: Training large models requires significant resources

**Solutions**:
- Mixed precision training
- Model pruning and quantization
- Knowledge distillation
- Efficient architectures (MobileNet, EfficientNet)

---

## Key Takeaways

- Neural networks excel at learning complex patterns from data
- Architecture selection should match the problem structure
- Training requires careful optimization and regularization
- Advanced techniques like transfer learning can dramatically improve results
- Practical applications span numerous domains from vision to language to time series
- Understanding and addressing common challenges is crucial for success

---

## Additional Resources

### Books
- **Deep Learning** by Goodfellow, Bengio, and Courville
- **Neural Networks and Deep Learning** by Michael Nielsen
- **Pattern Recognition and Machine Learning** by Christopher Bishop

### Online Courses
- Stanford CS231n: Convolutional Neural Networks for Visual Recognition
- DeepLearning.AI specialization on Coursera
- Fast.ai Practical Deep Learning for Coders

### Research Papers
- "Attention Is All You Need" (Transformers)
- "Deep Residual Learning for Image Recognition" (ResNet)
- "Generative Adversarial Networks" (GANs)

### Tools and Libraries
- PyTorch
- TensorFlow
- Keras
- Hugging Face Transformers

---

*These notes were generated by EduAI based on your uploaded PDF document.*`;
  } catch (error) {
    console.error('Error generating notes from PDF:', error);
    
    // Return a simple error message as notes
    return `# ${subject}: ${level} Level Study Notes

## Error Generating Notes
We encountered an error while processing your PDF. Please try again with a different PDF file or check that the file is not corrupted.

---

## Key Concepts in ${subject}
1. **Introduction to ${subject}**: Basic principles and foundations.
2. **Core Methodologies**: Standard approaches in the field.
3. **Advanced Applications**: How these concepts are applied in real-world scenarios.

---
*These notes were generated as a fallback due to an error processing your PDF.*`;
  }
};