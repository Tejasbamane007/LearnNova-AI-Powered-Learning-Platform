// Utility function to generate a timetable with proper time formatting

export interface StudyTopic {
  title: string;
  hours: number;
}

export interface StudySession {
  topic: string;
  startTime: string;
  endTime: string;
  duration: number;
  isBreak: boolean;
  completed?: boolean;
}

export interface TimetableEntry {
  date: string;
  sessions: StudySession[];
}

/**
 * Generates a study timetable with proper time formatting
 */
export function generateTimetable(
  startDateStr: string, 
  endDateStr: string, 
  topics: StudyTopic[]
): TimetableEntry[] {
  console.log("Generating timetable:", { startDateStr, endDateStr, topics });
  
  if (!topics || topics.length === 0) {
    console.log("No topics provided, returning empty timetable");
    return [];
  }
  
  // Validate topics
  const validatedTopics = topics.map(topic => ({
    title: topic.title || `Topic ${Math.random().toString(36).substring(7)}`,
    hours: topic.hours <= 0 ? 1 : topic.hours
  }));
  
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const timetable: TimetableEntry[] = [];
  
  // Calculate date range
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const isVeryShortRange = daysDiff <= 2;
  
  // Get all available dates
  const availableDates: Date[] = [];
  for (let i = 0; i <= daysDiff; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    
    // For very short ranges, include weekends
    // For longer ranges, skip weekends
    if (isVeryShortRange || (date.getDay() !== 0 && date.getDay() !== 6)) {
      availableDates.push(date);
    }
  }
  
  // If no dates are available, include the start date
  if (availableDates.length === 0) {
    availableDates.push(start);
  }
  
  // Calculate topics per day
  const totalTopics = validatedTopics.length;
  let maxTopicsPerDay;
  
  if (isVeryShortRange) {
    // For 1-day range, try to fit all topics in one day (up to 10)
    if (daysDiff === 0) {
      maxTopicsPerDay = Math.min(10, totalTopics);
    } else {
      // For 2-day range, distribute evenly (up to 5 per day)
      maxTopicsPerDay = Math.min(5, Math.ceil(totalTopics / 2));
    }
  } else {
    // For longer ranges, limit to 3 topics per day
    maxTopicsPerDay = 3;
  }
  
  // Calculate topics per day based on available dates
  const topicsPerDay = Math.ceil(totalTopics / availableDates.length);
  
  // Use the smaller of the calculated values to avoid overloading days
  const actualTopicsPerDay = Math.min(maxTopicsPerDay, topicsPerDay);
  
  console.log(`Distributing ${totalTopics} topics across ${availableDates.length} days (${actualTopicsPerDay} topics per day)`);
  
  // Distribute topics across days
  let topicIndex = 0;
  
  for (let dateIndex = 0; dateIndex < availableDates.length && topicIndex < validatedTopics.length; dateIndex++) {
    const currentDate = availableDates[dateIndex];
    const dateString = currentDate.toISOString().split('T')[0];
    const sessions: StudySession[] = [];
    
    // Track hours and minutes separately for accurate time calculation
    let currentHour = 9; // Start at 9 AM
    let currentMinute = 0;
    
    // Calculate how many topics to assign to this day
    const topicsForThisDay = Math.min(actualTopicsPerDay, validatedTopics.length - topicIndex);
    
    // Process topics for this day
    for (let i = 0; i < topicsForThisDay; i++) {
      const topic = validatedTopics[topicIndex];
      
      // For short ranges, use the full topic hours without splitting
      // For longer ranges, we might want to split very long topics
      const maxSessionLength = isVeryShortRange ? 3 : 2;
      const sessionDuration = Math.min(topic.hours, maxSessionLength);
      const durationMinutes = Math.floor(sessionDuration * 60); // Convert to minutes
      
      // Format start time
      const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      
      // Calculate end time
      let endHour = currentHour;
      let endMinute = currentMinute + durationMinutes;
      
      // Handle minute overflow
      if (endMinute >= 60) {
        endHour += Math.floor(endMinute / 60);
        endMinute = endMinute % 60;
      }
      
      // Check if we've gone past midnight (24 hours)
      if (endHour >= 24) {
        console.log(`Warning: Schedule for ${dateString} extends past midnight. Stopping at ${currentHour}:${currentMinute}`);
        break; // Stop adding topics to this day
      }
      
      // Format end time
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
      
      // Add study session
      sessions.push({
        topic: topic.title,
        startTime,
        endTime,
        duration: sessionDuration,
        isBreak: false,
        completed: false
      });
      
      // Update current time to end time
      currentHour = endHour;
      currentMinute = endMinute;
      
      topicIndex++;
      
      // Add a break unless it's the last topic or we're at the end of the day
      if (i < topicsForThisDay - 1 && topicIndex < validatedTopics.length) {
        // Format break start time (same as previous end time)
        const breakStartTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        // Add 15 minute break
        endMinute += 15;
        if (endMinute >= 60) {
          endHour += 1;
          endMinute -= 60;
        }
        
        // Check if we've gone past midnight (24 hours)
        if (endHour >= 24) {
          console.log(`Warning: Break for ${dateString} extends past midnight. Stopping at ${currentHour}:${currentMinute}`);
          break; // Stop adding topics to this day
        }
        
        // Format break end time
        const breakEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        sessions.push({
          topic: 'Break',
          startTime: breakStartTime,
          endTime: breakEndTime,
          duration: 0.25, // 15 minutes
          isBreak: true,
          completed: false
        });
        
        // Update current time to break end time
        currentHour = endHour;
        currentMinute = endMinute;
      }
      
      // Add a lunch break if we're around noon and have more topics to go
      if (currentHour >= 12 && currentHour < 13 && i < topicsForThisDay - 1) {
        // Format lunch start time (same as previous end time)
        const lunchStartTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        // Add 1 hour lunch break
        endHour += 1;
        
        // Format lunch end time
        const lunchEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        sessions.push({
          topic: 'Lunch Break',
          startTime: lunchStartTime,
          endTime: lunchEndTime,
          duration: 1, // 1 hour
          isBreak: true,
          completed: false
        });
        
        // Update current time to lunch end time
        currentHour = endHour;
      }
    }
    
    // Add this day to the timetable
    if (sessions.length > 0) {
      timetable.push({
        date: dateString,
        sessions
      });
    }
  }
  
  // If we still have topics left, create additional days
  while (topicIndex < validatedTopics.length) {
    // Create a new day after the last one
    const lastDate = timetable.length > 0 
      ? new Date(timetable[timetable.length - 1].date)
      : new Date(start);
    
    lastDate.setDate(lastDate.getDate() + 1);
    const dateString = lastDate.toISOString().split('T')[0];
    
    const sessions: StudySession[] = [];
    let currentHour = 9; // Start at 9 AM
    let currentMinute = 0;
    
    // Calculate how many topics to assign to this additional day
    const topicsForThisDay = Math.min(actualTopicsPerDay, validatedTopics.length - topicIndex);
    
    // Process topics for this additional day
    for (let i = 0; i < topicsForThisDay; i++) {
      const topic = validatedTopics[topicIndex];
      
      // For short ranges, use the full topic hours without splitting
      // For longer ranges, we might want to split very long topics
      const maxSessionLength = 2; // Use standard session length for additional days
      const sessionDuration = Math.min(topic.hours, maxSessionLength);
      const durationMinutes = Math.floor(sessionDuration * 60); // Convert to minutes
      
      // Format start time
      const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      
      // Calculate end time
      let endHour = currentHour;
      let endMinute = currentMinute + durationMinutes;
      
      // Handle minute overflow
      if (endMinute >= 60) {
        endHour += Math.floor(endMinute / 60);
        endMinute = endMinute % 60;
      }
      
      // Check if we've gone past midnight (24 hours)
      if (endHour >= 24) {
        console.log(`Warning: Schedule for ${dateString} extends past midnight. Stopping at ${currentHour}:${currentMinute}`);
        break; // Stop adding topics to this day
      }
      
      // Format end time
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
      
      // Add study session
      sessions.push({
        topic: topic.title,
        startTime,
        endTime,
        duration: sessionDuration,
        isBreak: false,
        completed: false
      });
      
      // Update current time to end time
      currentHour = endHour;
      currentMinute = endMinute;
      
      topicIndex++;
      
      // Add a break unless it's the last topic or we're at the end of the day
      if (i < topicsForThisDay - 1 && topicIndex < validatedTopics.length) {
        // Format break start time (same as previous end time)
        const breakStartTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        // Add 15 minute break
        endMinute += 15;
        if (endMinute >= 60) {
          endHour += 1;
          endMinute -= 60;
        }
        
        // Check if we've gone past midnight (24 hours)
        if (endHour >= 24) {
          console.log(`Warning: Break for ${dateString} extends past midnight. Stopping at ${currentHour}:${currentMinute}`);
          break; // Stop adding topics to this day
        }
        
        // Format break end time
        const breakEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        sessions.push({
          topic: 'Break',
          startTime: breakStartTime,
          endTime: breakEndTime,
          duration: 0.25, // 15 minutes
          isBreak: true,
          completed: false
        });
        
        // Update current time to break end time
        currentHour = endHour;
        currentMinute = endMinute;
      }
      
      // Add a lunch break if we're around noon and have more topics to go
      if (currentHour >= 12 && currentHour < 13 && i < topicsForThisDay - 1) {
        // Format lunch start time (same as previous end time)
        const lunchStartTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        // Add 1 hour lunch break
        endHour += 1;
        
        // Format lunch end time
        const lunchEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        sessions.push({
          topic: 'Lunch Break',
          startTime: lunchStartTime,
          endTime: lunchEndTime,
          duration: 1, // 1 hour
          isBreak: true,
          completed: false
        });
        
        // Update current time to lunch end time
        currentHour = endHour;
      }
    }
    
    // Add this day to the timetable
    if (sessions.length > 0) {
      timetable.push({
        date: dateString,
        sessions
      });
    }
  }
  
  return timetable;
}