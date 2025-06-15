import apiRequest from './api';

// Generate notes from a PDF file
export const generateNotesFromPdf = async (courseId: string, file: File, autoSave: boolean = false) => {
  // Create a FormData object to send the file
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('courseId', courseId);
  formData.append('autoSave', autoSave.toString());

  // Custom fetch for file upload (not using apiRequest helper)
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token not found');
  }
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const response = await fetch(`${apiUrl}/pdf/generate-notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to generate notes from PDF');
  }

  return response.json();
};

// Save generated notes to a course
export const saveNotesToCourse = async (courseId: string, notes: string, fileName: string = "Generated Notes") => {
  return apiRequest(
    '/pdf/save-notes', 
    'POST', 
    {
      courseId,
      notes,
      fileName
    }
  );
};

// Get generated PDF notes for a course
export const getPdfNotes = async (courseId: string) => {
  return apiRequest(`/pdf/notes/${courseId}`);
};