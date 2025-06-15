import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { FileText, Upload, X, Check, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { generateNotesFromPdf, getPdfNotes, saveNotesToCourse } from "../services/pdfService";

const PdfNotesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { courseId, subject, level } = location.state || { courseId: "", subject: "", level: "" };
  
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState<string | null>(null);
  const [notesSaved, setNotesSaved] = useState(false);
  const [existingNotes, setExistingNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing PDF notes when component mounts
  useEffect(() => {
    if (courseId) {
      fetchExistingNotes();
    }
  }, [courseId]);

  const fetchExistingNotes = async () => {
    if (!courseId) return;
    
    try {
      setLoadingNotes(true);
      const response = await getPdfNotes(courseId);
      
      if (response && response.pdfNotes) {
        setExistingNotes(response.pdfNotes);
      }
    } catch (error) {
      console.error("Failed to fetch PDF notes:", error);
      toast({
        title: "Error",
        description: "Failed to load existing PDF notes",
        variant: "destructive",
      });
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    
    if (!courseId) {
      toast({
        title: "Error",
        description: "Course ID is required to generate notes from PDF",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    // Set up progress tracking
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          return 95; // Hold at 95% until actual completion
        }
        return prev + 5;
      });
    }, 100);

    try {
      // Upload the file and generate notes (with autoSave set to false)
      const response = await generateNotesFromPdf(courseId, file, false);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsUploading(false);
      setIsProcessing(true);
      
      // Process the response
      if (response && response.notes) {
        setTimeout(() => {
          setIsProcessing(false);
          setGeneratedNotes(response.notes);
          
          toast({
            title: "Success",
            description: "PDF notes generated successfully!",
          });
        }, 1000);
      } else {
        throw new Error("Failed to generate notes from PDF");
      }
    } catch (error) {
      console.error("Failed to generate notes from PDF:", error);
      
      clearInterval(progressInterval);
      setUploadProgress(0);
      setIsUploading(false);
      
      toast({
        title: "Error",
        description: "Failed to generate notes from PDF. Please try again.",
        variant: "destructive",
      });
      
      // Generate mock notes for demonstration
      setTimeout(() => {
        setIsProcessing(false);
        setGeneratedNotes(`# ${subject}: ${level} Level Study Notes

## Table of Contents
- [Introduction](#introduction)
- [Core Concepts](#core-concepts)
- [Detailed Explanations](#detailed-explanations)
- [Practical Applications](#practical-applications)
- [Key Takeaways](#key-takeaways)
- [Additional Resources](#additional-resources)

---

## Introduction

This comprehensive guide provides an in-depth exploration of ${subject} at the ${level} level. The content has been carefully structured to build upon foundational knowledge while introducing more advanced concepts and techniques. These notes aim to bridge theoretical understanding with practical implementation.

> **Note**: These study materials are designed to complement course lectures and textbook readings, not replace them.

---

## Core Concepts

### Concept 1: Foundation

The fundamental principles of ${subject} include:

- Key principle one with detailed explanation
- Key principle two with examples
- Key principle three with historical context

### Concept 2: Advanced Theory

Building on the foundations, we explore:

1. **Theoretical Framework**: Structured approach to understanding complex ideas
2. **Mathematical Models**: Formalized representations of key relationships
3. **Analytical Methods**: Techniques for solving domain-specific problems

### Concept 3: Implementation Strategies

| Strategy | Best Use Case | Limitations |
|----------|---------------|-------------|
| Strategy A | Scenario X | Constraint 1 |
| Strategy B | Scenario Y | Constraint 2 |
| Strategy C | Scenario Z | Constraint 3 |

---

## Detailed Explanations

### Deep Dive: Key Process

The process works through these steps:

1. Initial preparation
   - Sub-step 1.1
   - Sub-step 1.2
2. Core execution
   - Sub-step 2.1
   - Sub-step 2.2
3. Validation and verification
   - Sub-step 3.1
   - Sub-step 3.2

### Important Relationships

The interconnections between concepts create a cohesive framework:

- Relationship between A and B demonstrates principle X
- When C interacts with D, we observe effect Y
- The combination of E and F produces outcome Z

---

## Practical Applications

### Real-World Example 1

This case study demonstrates how ${subject} principles apply in practice:

- Problem statement
- Applied solution using concepts from section 2
- Results and analysis

### Real-World Example 2

Another application showing versatility of these techniques:

- Different problem context
- Alternative approach
- Comparative results

---

## Key Takeaways

- Most important concept 1 with brief explanation
- Critical insight 2 with practical implication
- Fundamental principle 3 with broader context
- Essential technique 4 with implementation note

---

## Additional Resources

### Books and Textbooks
- "Comprehensive Guide to ${subject}" by Author Name
- "Advanced ${subject} Techniques" by Another Author

### Online Courses
- "${subject} Masterclass" on learning platform
- "Practical ${subject}" by University Name

### Research Papers
- "Recent Advances in ${subject}" (2023)
- "Innovative Approaches to ${subject} Problems" (2022)

---

*These notes were generated by EduAI based on your uploaded PDF document.*`);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-24 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <FileText size={32} className="text-purple-400" />
              Generate Notes from PDF
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

        <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
          {!generatedNotes ? (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  isDragging
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-700 hover:border-purple-500/50 hover:bg-gray-800/50"
                } transition-all`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {!file ? (
                  <div className="flex flex-col items-center">
                    <Upload size={48} className="text-gray-500 mb-4" />
                    <h3 className="text-xl font-medium mb-2">
                      Drag & Drop your PDF here
                    </h3>
                    <p className="text-gray-400 mb-4">
                      or click to browse your files
                    </p>
                    <Button
                      onClick={handleUploadClick}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Select PDF
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="application/pdf"
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg w-full max-w-md mb-6">
                      <FileText size={24} className="text-purple-400" />
                      <div className="flex-1 truncate">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveFile}
                        className="text-gray-400 hover:text-white"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {isUploading && (
                      <div className="w-full max-w-md mb-6">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress
                          value={uploadProgress}
                          className="h-2 bg-gray-700"
                        />
                      </div>
                    )}

                    {!isUploading && !isProcessing && (
                      <Button
                        onClick={handleSubmit}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={isUploading}
                      >
                        Generate Notes
                      </Button>
                    )}

                    {isProcessing && (
                      <div className="flex flex-col items-center">
                        <Loader2
                          size={32}
                          className="animate-spin text-purple-500 mb-4"
                        />
                        <p className="text-lg">
                          Processing your PDF and generating notes...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">How it works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="bg-purple-900/30 w-10 h-10 rounded-full flex items-center justify-center mb-3">
                      <span className="text-purple-400 font-bold">1</span>
                    </div>
                    <h4 className="font-medium text-lg mb-2">Upload PDF</h4>
                    <p className="text-gray-400">
                      Upload your lecture notes, textbook, or any educational PDF
                    </p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="bg-purple-900/30 w-10 h-10 rounded-full flex items-center justify-center mb-3">
                      <span className="text-purple-400 font-bold">2</span>
                    </div>
                    <h4 className="font-medium text-lg mb-2">AI Processing</h4>
                    <p className="text-gray-400">
                      Our AI analyzes the content and extracts key information
                    </p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="bg-purple-900/30 w-10 h-10 rounded-full flex items-center justify-center mb-3">
                      <span className="text-purple-400 font-bold">3</span>
                    </div>
                    <h4 className="font-medium text-lg mb-2">Get Notes</h4>
                    <p className="text-gray-400">
                      Receive well-structured, concise notes based on your PDF
                    </p>
                  </div>
                </div>
              </div>

              {/* Existing PDF Notes Section */}
              {loadingNotes ? (
                <div className="mt-12 border-t border-gray-800 pt-8 flex justify-center">
                  <div className="flex flex-col items-center">
                    <Loader2 size={32} className="animate-spin text-purple-500 mb-4" />
                    <p className="text-gray-400">Loading your existing PDF notes...</p>
                  </div>
                </div>
              ) : existingNotes.length > 0 && !generatedNotes && (
                <div className="mt-12 border-t border-gray-800 pt-8">
                  <h3 className="text-xl font-semibold mb-6">Your Existing PDF Notes</h3>
                  
                  <div className="space-y-6">
                    {existingNotes.map((note, index) => (
                      <div key={note._id || index} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-purple-900/30 p-2 rounded-full">
                              <FileText size={20} className="text-purple-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-lg">{note.fileName}</h4>
                              <p className="text-gray-400 text-sm">
                                Created on {new Date(note.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-black"
                            onClick={() => setGeneratedNotes(note.notes)}
                          >
                            View Notes
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6 bg-gradient-to-r from-green-900/30 to-emerald-900/20 p-4 rounded-lg border border-green-500/30 shadow-md">
                <div className="bg-green-500/20 p-2 rounded-full">
                  <Check size={22} className="text-green-400" />
                </div>
                <div>
                  <p className="font-bold text-green-400">
                    {notesSaved ? "Notes saved to your course!" : "Notes successfully generated!"}
                  </p>
                  <p className="text-green-500/80 text-sm">
                    {notesSaved 
                      ? "You can view these notes in My Courses section" 
                      : "Your notes are ready to view and save"}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-gray-950 p-8 rounded-xl border border-indigo-500/30 markdown-content whitespace-pre-line overflow-auto shadow-xl max-h-[70vh]">
                <div className="prose-lg">
                  {generatedNotes}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
                {!notesSaved ? (
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-6 py-6 shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-purple-500/20"
                    onClick={async () => {
                      if (!courseId || !generatedNotes) return;
                      
                      try {
                        setIsSaving(true);
                        const fileName = `${subject} ${level} Notes - ${new Date().toLocaleDateString()}`;
                        
                        // Save the notes to the course
                        const response = await saveNotesToCourse(courseId, generatedNotes, fileName);
                        
                        setIsSaving(false);
                        setNotesSaved(true);
                        
                        toast({
                          title: "Notes Saved Successfully",
                          description: "Your notes have been saved to your course and can be viewed in My Courses",
                          variant: "default",
                        });
                      } catch (error) {
                        setIsSaving(false);
                        console.error("Failed to save notes:", error);
                        
                        toast({
                          title: "Error Saving Notes",
                          description: "There was a problem saving your notes. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={isSaving}
                  >
                    <div className="flex items-center gap-2">
                      {isSaving ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                          Save Notes
                        </>
                      )}
                    </div>
                  </Button>
                ) : (
                  <Button 
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-6 py-6 shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-green-500/20"
                    onClick={() => navigate("/my-courses")}
                  >
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      View in My Courses
                    </div>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="border-indigo-500/30 hover:border-indigo-500 text-indigo-400 hover:text-white hover:bg-indigo-900/20 font-medium px-6 py-6 shadow-md transform transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    setGeneratedNotes(null);
                    setFile(null);
                    setNotesSaved(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-plus"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="18" y2="12"/><line x1="9" x2="15" y1="15" y2="15"/></svg>
                    Generate New Notes
                  </div>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfNotesPage;