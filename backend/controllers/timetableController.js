const Course = require('../models/Course');
const Timetable = require('../models/Timetable');
const { handleError } = require('../utils/errorHandler');

// Generate a study planner
exports.generateTimetable = async (req, res) => {
  try {
    console.log("Timetable generation request received");
    const { courseId } = req.params;
    const { startDate, endDate, topics } = req.body;
    const userId = req.user.userId;
    
    console.log("Timetable generation parameters:", { 
      courseId, 
      userId, 
      startDate, 
      endDate, 
      topicsCount: topics ? topics.length : 0 
    });

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    // Ensure we have valid topics
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ message: 'At least one valid topic is required' });
    }

    // Check if course exists and belongs to the user
    const course = await Course.findOne({ 
      $or: [
        { _id: courseId, user: userId },
        { _id: courseId, userId: userId }
      ]
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Use provided topics or get them from the course
    let studyTopics = [];
    
    // First priority: Use course topics if available
    if (course.topics && course.topics.length > 0) {
      console.log(`Using ${course.topics.length} topics from course`);
      studyTopics = course.topics.map(topic => ({
        title: topic.title,
        hours: topic.estimatedHours || calculateEstimatedHours(topic.title, course.difficulty)
      }));
      
      // Log the topics we're using
      console.log("Course topics being used:");
      studyTopics.forEach((topic, i) => {
        console.log(`  ${i+1}. ${topic.title} (${topic.hours} hours)`);
      });
    } 
    // Second priority: Use provided topics if course topics aren't available
    else if (topics && Array.isArray(topics) && topics.length > 0) {
      console.log(`Using ${topics.length} topics from request`);
      
      // Process topics and calculate hours if needed
      console.log("Calculating hours for topics based on their titles and course difficulty:", course.difficulty);
      studyTopics = topics.map(topic => {
        console.log(`Processing topic: ${topic.title}, current hours: ${topic.hours}`);
        
        // If hours is 0 or not specified, calculate it based on topic title
        let hours = topic.hours;
        if (!hours || hours <= 0) {
          hours = calculateEstimatedHours(topic.title, course.difficulty);
          console.log(`AI assigned ${hours} hours for topic: ${topic.title} (difficulty: ${course.difficulty})`);
        } else {
          console.log(`Using existing ${hours} hours for topic: ${topic.title}`);
        }
        
        return {
          ...topic,
          hours
        };
      });
      
      // Log the topics we're using
      console.log("Request topics being used:");
      studyTopics.forEach((topic, i) => {
        console.log(`  ${i+1}. ${topic.title} (${topic.hours} hours)`);
      });
    } 
    // Last resort: Generate default topics
    else {
      console.log(`Generating default topics for ${course.subject}`);
      studyTopics = generateDefaultTopics(course.subject, course.difficulty);
      
      // Log the topics we're using
      console.log("Default topics being used:");
      studyTopics.forEach((topic, i) => {
        console.log(`  ${i+1}. ${topic.title} (${topic.hours} hours)`);
      });
    }
    
    if (studyTopics.length === 0) {
      return res.status(400).json({ message: 'No study topics available. Please add topics to the course or provide them in the request.' });
    }
    
    console.log(`Final study topics for timetable: ${studyTopics.length} topics`);
    studyTopics.forEach((topic, index) => {
      console.log(`Topic ${index + 1}: ${topic.title} (${topic.hours} hours)`);
    });
    
    // Update the course with the study topics if they don't exist
    if (course.topics && course.topics.length > 0) {
      // Check if we need to update any topics
      const existingTopicTitles = course.topics.map(topic => topic.title);
      const newTopics = studyTopics.filter(topic => !existingTopicTitles.includes(topic.title));
      
      if (newTopics.length > 0) {
        // Add new topics to the course
        for (const topic of newTopics) {
          course.topics.push({
            title: topic.title,
            content: '',
            status: 'pending',
            estimatedHours: topic.hours
          });
        }
        await course.save();
      }
    } else {
      // Create topics array if it doesn't exist
      course.topics = studyTopics.map(topic => ({
        title: topic.title,
        content: '',
        status: 'pending',
        estimatedHours: topic.hours
      }));
      await course.save();
    }

    // Generate study planner
    console.log("Calling generateStudyPlanner with:", {
      topicsCount: studyTopics.length,
      topics: studyTopics.map(t => ({ title: t.title, hours: t.hours })),
      startDate,
      endDate
    });
    
    let timetableEntries;
    try {
      // Try the complex planner first
      timetableEntries = generateStudyPlanner(studyTopics, startDate, endDate);
      console.log(`Successfully generated timetable with ${timetableEntries.length} days`);
    } catch (plannerError) {
      console.error("Error in generateStudyPlanner:", plannerError);
      
      // If the complex planner fails, use a simple fallback
      console.log("Using simple fallback planner");
      timetableEntries = generateSimplePlanner(studyTopics, startDate, endDate);
      console.log(`Generated simple fallback timetable with ${timetableEntries.length} days`);
    }

    // Check if a timetable already exists for this course
    let timetable = await Timetable.findOne({ courseId });
    
    // If the request includes a timetable, use it (from frontend fallback)
    // Otherwise use our generated timetableEntries
    const entriesToUse = req.body.timetable || timetableEntries;
    
    console.log(`Using ${req.body.timetable ? 'frontend-provided' : 'backend-generated'} timetable with ${entriesToUse ? entriesToUse.length : 0} entries`);

    if (timetable) {
      // Update existing timetable
      timetable.entries = entriesToUse;
      timetable.startDate = startDate;
      timetable.endDate = endDate;
      timetable.topics = studyTopics; // Store the study topics we used
    } else {
      // Create a new timetable
      timetable = new Timetable({
        userId,
        courseId,
        entries: entriesToUse,
        startDate,
        endDate,
        topics: studyTopics, // Store the study topics we used
      });
    }

    await timetable.save();

    // Make sure we're returning topics with their hours
    const topicsWithHours = timetable.topics ? timetable.topics.map(topic => ({
      title: topic.title,
      hours: topic.hours
    })) : [];
    
    console.log("Returning topics with hours after generation:", topicsWithHours);
    
    res.status(200).json({
      success: true,
      timetable: timetable.entries, // Return entries as timetable for frontend compatibility
      topics: topicsWithHours, // Return the topics with their hours
      startDate: timetable.startDate,
      endDate: timetable.endDate
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Get timetable for a course
exports.getCourseTimetable = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    // Check if course exists and belongs to the user
    const course = await Course.findOne({ 
      $or: [
        { _id: courseId, user: userId },
        { _id: courseId, userId: userId }
      ]
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Find timetable for the course
    const timetable = await Timetable.findOne({ courseId });

    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found for this course' });
    }

    // Make sure we're returning topics with their hours
    const topicsWithHours = timetable.topics ? timetable.topics.map(topic => ({
      title: topic.title,
      hours: topic.hours
    })) : [];
    
    console.log("Returning topics with hours:", topicsWithHours);
    
    res.status(200).json({
      success: true,
      timetable: timetable.entries,
      startDate: timetable.startDate,
      endDate: timetable.endDate,
      topics: topicsWithHours, // Return the stored topics with their hours
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Mark a study session as completed
exports.markSessionCompleted = async (req, res) => {
  try {
    const { courseId, dateIndex, sessionIndex } = req.params;
    const { completed } = req.body;
    const userId = req.user.userId;

    if (!courseId || dateIndex === undefined || sessionIndex === undefined) {
      return res.status(400).json({ message: 'Course ID, date index, and session index are required' });
    }

    // Check if course exists and belongs to the user
    const course = await Course.findOne({ 
      $or: [
        { _id: courseId, user: userId },
        { _id: courseId, userId: userId }
      ]
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Find timetable for the course
    const timetable = await Timetable.findOne({ courseId });

    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found for this course' });
    }

    // Check if the date and session indices are valid
    if (!timetable.entries[dateIndex] || !timetable.entries[dateIndex].sessions[sessionIndex]) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Update the session's completed status
    timetable.entries[dateIndex].sessions[sessionIndex].completed = completed;
    await timetable.save();

    // If a study session is completed, update the course progress
    if (completed && !timetable.entries[dateIndex].sessions[sessionIndex].isBreak) {
      const topicTitle = timetable.entries[dateIndex].sessions[sessionIndex].topic;
      const topicIndex = course.topics.findIndex(topic => topic.title === topicTitle);
      
      if (topicIndex !== -1) {
        // Update the topic status if it's not already completed
        if (course.topics[topicIndex].status !== 'completed') {
          course.topics[topicIndex].status = 'in-progress';
          
          // Check if all sessions for this topic are completed
          const allSessionsForTopic = timetable.entries.flatMap(entry => 
            entry.sessions.filter(session => 
              !session.isBreak && session.topic === topicTitle
            )
          );
          
          const allCompleted = allSessionsForTopic.every(session => session.completed);
          
          if (allCompleted) {
            course.topics[topicIndex].status = 'completed';
            course.progress.completedTopics += 1;
          }
          
          await course.save();
        }
      }
      
      // Update study streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastStudied = course.studyStreak.lastStudied ? new Date(course.studyStreak.lastStudied) : null;
      if (lastStudied) {
        lastStudied.setHours(0, 0, 0, 0);
        
        const dayDiff = Math.floor((today.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          // Consecutive day, increment streak
          course.studyStreak.daysInARow += 1;
        } else if (dayDiff > 1) {
          // Streak broken, reset to 1
          course.studyStreak.daysInARow = 1;
        }
        // If dayDiff is 0, it's the same day, don't change the streak
      } else {
        // First time studying, set streak to 1
        course.studyStreak.daysInARow = 1;
      }
      
      course.studyStreak.lastStudied = today;
      await course.save();
    }

    res.status(200).json({
      success: true,
      message: 'Session status updated successfully',
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Helper function to estimate topic difficulty based on title
// Simple fallback planner that's guaranteed to work
function generateSimplePlanner(topics, startDateStr, endDateStr) {
  console.log("Generating simple fallback planner");
  
  // Ensure all topics have valid values and calculate hours if needed
  const validatedTopics = topics.map(topic => {
    const title = topic.title || `Topic ${Math.random().toString(36).substring(7)}`;
    
    // If hours is 0 or not specified, calculate it based on topic title
    let hours = topic.hours;
    if (!hours || hours <= 0) {
      hours = calculateEstimatedHours(title, 'intermediate'); // Use intermediate as default difficulty
      console.log(`Calculated ${hours} hours for topic: ${title}`);
    }
    
    return {
      ...topic,
      title,
      hours
    };
  });
  
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const timetableEntries = [];
  
  // Get all dates in the range
  const dates = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Calculate topics per day
  const topicsPerDay = Math.ceil(validatedTopics.length / dates.length);
  
  // Distribute topics across days
  let topicIndex = 0;
  for (let i = 0; i < dates.length && topicIndex < validatedTopics.length; i++) {
    const date = dates[i];
    const dateString = date.toISOString().split('T')[0];
    const sessions = [];
    
    // Add morning sessions (9 AM - 12 PM)
    let currentHour = 9;
    const topicsForThisDay = Math.min(topicsPerDay, validatedTopics.length - topicIndex);
    
    for (let j = 0; j < topicsForThisDay; j++) {
      const topic = validatedTopics[topicIndex + j];
      const duration = topic.hours * 60; // Use the actual hours specified, convert to minutes
      
      // Add study session
      sessions.push({
        topic: topic.title,
        startTime: `${currentHour}:00`,
        endTime: `${currentHour + Math.floor(duration / 60)}:${duration % 60 === 0 ? '00' : '30'}`,
        duration,
        isBreak: false
      });
      
      // Add a break unless it's the last topic
      if (j < topicsForThisDay - 1) {
        sessions.push({
          topic: 'Break',
          startTime: `${currentHour + Math.floor(duration / 60)}:${duration % 60 === 0 ? '00' : '30'}`,
          endTime: `${currentHour + Math.floor(duration / 60)}:${duration % 60 === 0 ? '15' : '45'}`,
          duration: 15,
          isBreak: true
        });
        
        // Update current hour
        currentHour += Math.floor(duration / 60) + 0.25; // Add session + 15 min break
      } else {
        // Just update current hour without a break
        currentHour += Math.floor(duration / 60) + (duration % 60) / 60;
      }
    }
    
    // Add this day to the timetable
    if (sessions.length > 0) {
      timetableEntries.push({
        date: dateString,
        sessions
      });
    }
    
    // Move to the next set of topics
    topicIndex += topicsForThisDay;
  }
  
  return timetableEntries;
}

function estimateTopicDifficulty(topicTitle) {
  const lowerTitle = topicTitle.toLowerCase();
  
  // Check for keywords indicating difficulty
  if (lowerTitle.includes('advanced') || 
      lowerTitle.includes('complex') || 
      lowerTitle.includes('expert') ||
      lowerTitle.includes('difficult') ||
      lowerTitle.includes('challenging')) {
    return 'hard';
  } else if (lowerTitle.includes('introduction') || 
             lowerTitle.includes('basic') || 
             lowerTitle.includes('beginner') ||
             lowerTitle.includes('simple') ||
             lowerTitle.includes('fundamental')) {
    return 'easy';
  } else {
    return 'medium';
  }
}

// Helper function to calculate estimated hours based on topic title and course difficulty
function calculateEstimatedHours(topicTitle, difficulty) {
  console.log(`Calculating hours for topic: "${topicTitle}" with difficulty: "${difficulty}"`);
  
  // Base hours depending on course difficulty
  let baseHours = 2; // Default for medium difficulty
  
  if (difficulty === 'beginner') {
    baseHours = 1.5;
  } else if (difficulty === 'intermediate') {
    baseHours = 2.5;
  } else if (difficulty === 'advanced') {
    baseHours = 3.5;
  } else if (difficulty === 'expert') {
    baseHours = 4;
  }
  
  console.log(`Base hours for ${difficulty} difficulty: ${baseHours}`);
  
  // Adjust based on topic keywords
  const lowerTitle = topicTitle.toLowerCase();
  
  // Advanced/complex topics
  if (lowerTitle.includes('advanced') || 
      lowerTitle.includes('complex') || 
      lowerTitle.includes('architecture') ||
      lowerTitle.includes('algorithm') ||
      lowerTitle.includes('optimization') ||
      lowerTitle.includes('framework') ||
      lowerTitle.includes('implementation') ||
      lowerTitle.includes('deep') ||
      lowerTitle.includes('neural')) {
    const hours = baseHours * 1.5;
    console.log(`Topic contains advanced keywords, assigning ${hours} hours`);
    return hours; // Advanced topics take more time (3-4 hours)
  } 
  // Practical/application topics
  else if (lowerTitle.includes('practice') || 
           lowerTitle.includes('exercise') || 
           lowerTitle.includes('lab') ||
           lowerTitle.includes('application') ||
           lowerTitle.includes('project') ||
           lowerTitle.includes('case study') ||
           lowerTitle.includes('implementation')) {
    const hours = baseHours * 1.3;
    console.log(`Topic contains practical keywords, assigning ${hours} hours`);
    return hours; // Practical topics take more time (2.5-3.5 hours)
  }
  // Core/fundamental topics
  else if (lowerTitle.includes('core') || 
           lowerTitle.includes('fundamental') || 
           lowerTitle.includes('principle') ||
           lowerTitle.includes('concept') ||
           lowerTitle.includes('theory') ||
           lowerTitle.includes('foundation')) {
    const hours = baseHours * 1.1;
    console.log(`Topic contains core/fundamental keywords, assigning ${hours} hours`);
    return hours; // Core topics take moderate time (2-3 hours)
  }
  // Introductory/basic topics
  else if (lowerTitle.includes('introduction') || 
           lowerTitle.includes('basic') ||
           lowerTitle.includes('overview') ||
           lowerTitle.includes('getting started') ||
           lowerTitle.includes('beginner')) {
    const hours = baseHours * 0.7;
    console.log(`Topic contains introductory keywords, assigning ${hours} hours`);
    return hours; // Introductory topics take less time (1-2 hours)
  }
  // Review/summary topics
  else if (lowerTitle.includes('review') || 
           lowerTitle.includes('summary') ||
           lowerTitle.includes('recap') ||
           lowerTitle.includes('conclusion')) {
    const hours = baseHours * 0.6;
    console.log(`Topic contains review keywords, assigning ${hours} hours`);
    return hours; // Review topics take less time (1-1.5 hours)
  }
  
  // No specific keywords found, use base hours
  console.log(`No specific keywords found, using base hours: ${baseHours}`);
  return baseHours; // Default return for topics without specific keywords
}

// Helper function to generate default topics based on course subject
function generateDefaultTopics(subject, difficulty) {
  // Create default topic titles
  const topicTitles = [
    `Introduction to ${subject}`,
    `Basic Concepts in ${subject}`,
    `Core Principles of ${subject}`,
    `Advanced Topics in ${subject}`,
    `Practical Applications of ${subject}`,
    `Case Studies in ${subject}`,
    `Review and Assessment of ${subject}`
  ];
  
  // Calculate hours for each topic based on its title and course difficulty
  const defaultTopics = topicTitles.map(title => ({
    title,
    hours: calculateEstimatedHours(title, difficulty)
  }));
  
  // Calculate hours for each topic
  return defaultTopics.map(topic => ({
    ...topic,
    hours: calculateEstimatedHours(topic.title, difficulty)
  }));
}

// Helper function to generate a study planner
function generateStudyPlanner(topics, startDate, endDate) {
  console.log("Starting generateStudyPlanner function");
  
  // Safety check: ensure we don't have any topics with 0 or negative hours
  topics = topics.map(topic => ({
    ...topic,
    hours: topic.hours <= 0 ? 1 : topic.hours, // Ensure minimum 1 hour per topic
    title: topic.title || `Topic ${Math.random().toString(36).substring(7)}` // Ensure title exists
  }));
  
  console.log("Validated topics:", topics);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timetableEntries = [];
  
  // Calculate total days between start and end dates
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  // Determine if this is a very short date range (1-2 days)
  const isVeryShortRange = totalDays <= 2;
  
  // Ensure all topics have valid hours and calculate if needed
  const validatedTopics = topics.map(topic => {
    const title = topic.title || `Topic ${Math.random().toString(36).substring(7)}`;
    
    // If hours is 0 or not specified, calculate it based on topic title
    let hours = topic.hours;
    if (!hours || hours <= 0) {
      hours = calculateEstimatedHours(title, 'intermediate'); // Use intermediate as default difficulty
      console.log(`Calculated ${hours} hours for topic: ${title}`);
    }
    
    return {
      ...topic,
      title,
      hours
    };
  });
  
  // Calculate total study hours needed
  const totalHoursNeeded = validatedTopics.reduce((sum, topic) => sum + topic.hours, 0);
  
  // Calculate available days (include weekends for very short ranges)
  const availableDays = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    // Include weekends for very short ranges
    if (isVeryShortRange) {
      return true;
    }
    return date.getDay() !== 0 && date.getDay() !== 6; // Exclude weekends for longer ranges
  }).filter(Boolean).length;
  
  // If no available days (should never happen), force at least one day
  const effectiveDays = Math.max(1, availableDays);
  
  // Calculate optimal hours per day based on date range and total hours
  const calculateOptimalHoursPerDay = () => {
    // Base calculation
    let optimal = Math.ceil(totalHoursNeeded / effectiveDays);
    
    // For very short ranges, allow more hours per day but respect daily limit
    if (isVeryShortRange) {
      if (totalDays === 1) {
        return Math.min(6, optimal); // For 1-day range, allow up to 6 hours
      } else {
        return Math.min(6, optimal); // For 2-day range, allow up to 6 hours
      }
    }
    
    // For normal ranges, use standard caps
    if (totalHoursNeeded <= 10) {
      return Math.min(3, optimal); // For very short courses, max 3 hours/day
    } else if (totalHoursNeeded <= 20) {
      return Math.min(4, optimal); // For short courses, max 4 hours/day
    } else if (totalHoursNeeded <= 40) {
      return Math.min(5, optimal); // For medium courses, max 5 hours/day
    } else {
      return Math.min(6, optimal); // For long courses, max 6 hours/day
    }
  };
  
  const hoursPerDay = calculateOptimalHoursPerDay();
  
  // Distribute topics across available days
  let currentDate = new Date(start);
  let topicIndex = 0;
  let remainingHours = validatedTopics[topicIndex].hours;
  
  // Add a safety counter to prevent infinite loops
  let safetyCounter = 0;
  const MAX_ITERATIONS = 1000; // Reasonable upper limit
  
  while (currentDate <= end && topicIndex < validatedTopics.length && safetyCounter < MAX_ITERATIONS) {
    safetyCounter++;
    // Skip weekends only for longer date ranges
    if (!isVeryShortRange && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    const dateString = currentDate.toISOString().split('T')[0];
    const dailySessions = [];
    let dailyHours = 0;
    
    // Determine optimal start time (between 8 AM and 10 AM)
    const dayOfWeek = currentDate.getDay();
    // Vary start time slightly by day of week for more realistic scheduling
    const startHours = [9, 8, 10, 9, 8][dayOfWeek - 1] || 9; // Default to 9 AM
    
    let currentHour = startHours;
    let currentMinute = 0;
    
    // Maximum end time is 21:00 (9 PM)
    const MAX_END_HOUR = 21;
    
    // Add study sessions until we reach the daily limit or run out of topics
    let innerSafetyCounter = 0;
    const MAX_INNER_ITERATIONS = 100; // Reasonable upper limit for inner loop
    
    while (dailyHours < hoursPerDay && topicIndex < validatedTopics.length && innerSafetyCounter < MAX_INNER_ITERATIONS) {
      innerSafetyCounter++;
      const topic = validatedTopics[topicIndex];
      
      // Calculate optimal session duration
      const calculateSessionDuration = () => {
        const topicDifficulty = estimateTopicDifficulty(topic.title);
        
        // Use the actual hours specified for the topic, but respect remaining hours
        return Math.min(topic.hours, remainingHours);
      };
      
      const hoursToAllocate = Math.min(
        calculateSessionDuration(),
        hoursPerDay - dailyHours
      );
      
      if (hoursToAllocate > 0) {
        // Calculate start and end times
        const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        // Convert hours to minutes and add to current time
        const durationMinutes = Math.floor(hoursToAllocate * 60);
        let endHour = currentHour;
        let endMinute = currentMinute + durationMinutes;
        
        // Adjust for hour overflow
        if (endMinute >= 60) {
          endHour += Math.floor(endMinute / 60);
          endMinute = endMinute % 60;
        }
        
        // Check if this session would go past the maximum end time
        if (endHour > MAX_END_HOUR || (endHour === MAX_END_HOUR && endMinute > 0)) {
          // If we would exceed the max time, move to the next day
          break;
        }
        
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        // Add study session
        dailySessions.push({
          topic: topic.title,
          startTime,
          endTime,
          duration: durationMinutes,
          isBreak: false
        });
        
        // Update tracking variables
        dailyHours += hoursToAllocate;
        remainingHours -= hoursToAllocate;
        
        // Update current time for next session
        currentHour = endHour;
        currentMinute = endMinute;
        
        // Determine break duration based on study session length and date range
        let breakDuration = 0;
        
        // For very short date ranges, use shorter breaks to fit more content
        if (isVeryShortRange) {
          if (hoursToAllocate <= 1) {
            breakDuration = 5; // 5 min break after short/medium sessions
          } else if (hoursToAllocate <= 2) {
            breakDuration = 10; // 10 min break after longer sessions
          } else {
            breakDuration = 15; // 15 min break after very long sessions
          }
        } 
        // For normal date ranges, use standard break durations
        else {
          if (hoursToAllocate <= 0.5) {
            breakDuration = 5; // 5 min break after short sessions
          } else if (hoursToAllocate <= 1) {
            breakDuration = 10; // 10 min break after medium sessions
          } else if (hoursToAllocate <= 1.5) {
            breakDuration = 15; // 15 min break after longer sessions
          } else {
            breakDuration = 20; // 20 min break after very long sessions
          }
        }
        
        // Add a break after study session (unless it's the end of the day)
        if (dailyHours < hoursPerDay && topicIndex < validatedTopics.length) {
          const breakStartTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          
          // Add break minutes
          endMinute += breakDuration;
          if (endMinute >= 60) {
            endHour += 1;
            endMinute -= 60;
          }
          
          // Check if break would go past the maximum end time
          if (endHour > MAX_END_HOUR || (endHour === MAX_END_HOUR && endMinute > 0)) {
            // If we would exceed the max time, skip the break and move to the next day
            break;
          }
          
          const breakEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
          
          dailySessions.push({
            topic: 'Break',
            startTime: breakStartTime,
            endTime: breakEndTime,
            duration: breakDuration,
            isBreak: true
          });
          
          // Update current time for next session
          currentHour = endHour;
          currentMinute = endMinute;
        }
        
        // Move to next topic if this one is completed
        if (remainingHours <= 0) {
          if (topicIndex < topics.length - 1) {
            // Move to the next topic
            topicIndex++;
            remainingHours = topics[topicIndex].hours;
          } else {
            // We're on the last topic and it's completed, break out of the loop
            break;
          }
        }
      }
    }
    
    // Add the day's sessions to the timetable
    if (dailySessions.length > 0) {
      timetableEntries.push({
        date: dateString,
        sessions: dailySessions
      });
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Check if we've covered all topics
  if (topicIndex < validatedTopics.length) {
    console.log(`Not all topics were scheduled. Adding ${validatedTopics.length - topicIndex} remaining topics to additional days.`);
    
    // Create additional days as needed to fit all remaining topics
    let additionalDate = new Date(end);
    additionalDate.setDate(additionalDate.getDate() + 1);
    
    // Reset safety counter for additional days loop
    safetyCounter = 0;
    
    while (topicIndex < validatedTopics.length && safetyCounter < MAX_ITERATIONS) {
      safetyCounter++;
      // Skip weekends for additional days (unless it's a very short range)
      if (!isVeryShortRange && (additionalDate.getDay() === 0 || additionalDate.getDay() === 6)) {
        additionalDate.setDate(additionalDate.getDate() + 1);
        continue;
      }
      
      const dateString = additionalDate.toISOString().split('T')[0];
      const dailySessions = [];
      
      // Start at 9 AM for additional days
      let currentHour = 9;
      let currentMinute = 0;
      let dailyHours = 0;
      
      // Add up to hoursPerDay of content for this additional day
      let innerSafetyCounter = 0;
      
      // Maximum end time is 21:00 (9 PM)
      const MAX_END_HOUR = 21;
      
      while (dailyHours < hoursPerDay && topicIndex < validatedTopics.length && innerSafetyCounter < MAX_INNER_ITERATIONS) {
        innerSafetyCounter++;
        const topic = validatedTopics[topicIndex];
        
        // Calculate session duration based on topic difficulty
        const topicDifficulty = estimateTopicDifficulty(topic.title);
        let sessionDuration;
        
        // Use the actual hours specified for the topic, but respect remaining hours
        sessionDuration = Math.min(topic.hours, remainingHours);
        
        // Calculate start and end times
        const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        // Convert hours to minutes and add to current time
        const durationMinutes = Math.floor(sessionDuration * 60);
        let endHour = currentHour;
        let endMinute = currentMinute + durationMinutes;
        
        // Adjust for hour overflow
        if (endMinute >= 60) {
          endHour += Math.floor(endMinute / 60);
          endMinute = endMinute % 60;
        }
        
        // Check if this session would go past the maximum end time
        if (endHour > MAX_END_HOUR || (endHour === MAX_END_HOUR && endMinute > 0)) {
          // If we would exceed the max time, move to the next day
          break;
        }
        
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        // Add study session
        dailySessions.push({
          topic: topic.title,
          startTime,
          endTime,
          duration: durationMinutes,
          isBreak: false
        });
        
        // Update tracking variables
        dailyHours += sessionDuration;
        remainingHours -= sessionDuration;
        currentHour = endHour;
        currentMinute = endMinute;
        
        // Add a break unless it's the last topic
        if (topicIndex < validatedTopics.length - 1 && dailyHours < hoursPerDay) {
          // Determine break duration based on study session length
          let breakDuration;
          if (sessionDuration <= 1) {
            breakDuration = 10; // 10 min break after short sessions
          } else if (sessionDuration <= 2) {
            breakDuration = 15; // 15 min break after medium sessions
          } else {
            breakDuration = 20; // 20 min break after long sessions
          }
          
          const breakStartTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          
          // Add break minutes
          endMinute += breakDuration;
          if (endMinute >= 60) {
            endHour += 1;
            endMinute -= 60;
          }
          
          // Check if break would go past the maximum end time
          if (endHour > MAX_END_HOUR || (endHour === MAX_END_HOUR && endMinute > 0)) {
            // If we would exceed the max time, skip the break and move to the next day
            break;
          }
          
          const breakEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
          
          dailySessions.push({
            topic: 'Break',
            startTime: breakStartTime,
            endTime: breakEndTime,
            duration: breakDuration,
            isBreak: true
          });
          
          currentHour = endHour;
          currentMinute = endMinute;
        }
        
        // Move to next topic if this one is completed
        if (remainingHours <= 0) {
          if (topicIndex < topics.length - 1) {
            // Move to the next topic
            topicIndex++;
            remainingHours = topics[topicIndex].hours;
          } else {
            // Last topic is completed
            topicIndex++;
            // Break out of the loop since we're done with all topics
            break;
          }
        }
      }
      
      // Add the additional day to the timetable
      if (dailySessions.length > 0) {
        timetableEntries.push({
          date: dateString,
          sessions: dailySessions
        });
      }
      
      // Move to next day
      additionalDate.setDate(additionalDate.getDate() + 1);
    }
  }
  
  return timetableEntries;
}