import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useToast } from "@/components/ui/use-toast";
import { 
  generateQuiz, 
  getQuiz, 
  submitQuiz, 
  QuizQuestion 
} from "../services/quizService";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Trophy 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface QuizState {
  id: string;
  questions: QuizQuestion[];
  currentQuestion: number;
  selectedAnswers: string[];
  timeRemaining: number;
  quizCompleted: boolean;
  score: number | null;
  results: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[] | null;
}

const QuizPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { courseId, subject, level, generate } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>({
    id: "",
    questions: [],
    currentQuestion: 0,
    selectedAnswers: [],
    timeRemaining: 0,
    quizCompleted: false,
    score: null,
    results: null,
  });
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (generate) {
      handleGenerateQuiz();
    } else {
      fetchExistingQuiz();
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [courseId, subject, level, generate]);

  const fetchExistingQuiz = async () => {
    try {
      setLoading(true);
      
      // Try to generate a quiz - the backend will return an existing one if it exists
      const response = await generateQuiz(subject, level, courseId);
      
      if (response && response.quiz) {
        const quiz = response.quiz;
        
        // Check if the quiz is already completed
        if (quiz.completed) {
          // Show the results directly
          setQuizState({
            id: quiz.id,
            questions: quiz.questions,
            currentQuestion: 0,
            selectedAnswers: new Array(quiz.questions.length).fill(""),
            timeRemaining: 0,
            quizCompleted: true,
            score: quiz.score,
            results: quiz.results,
          });
          
          toast({
            title: "Quiz Results",
            description: `You previously scored ${quiz.score} out of ${quiz.questions.length}!`,
          });
        } else {
          // Set up the quiz for taking
          setQuizState({
            id: quiz.id,
            questions: quiz.questions,
            currentQuestion: 0,
            selectedAnswers: new Array(quiz.questions.length).fill(""),
            timeRemaining: quiz.questions.length * 30, // 30 seconds per question
            quizCompleted: false,
            score: null,
            results: null,
          });
          
          // Start the timer
          const intervalId = setInterval(() => {
            setQuizState((prev) => {
              if (prev.timeRemaining <= 1) {
                clearInterval(intervalId);
                // Auto-submit when time runs out
                handleSubmitQuiz(prev.selectedAnswers);
                return { ...prev, timeRemaining: 0 };
              }
              return { ...prev, timeRemaining: prev.timeRemaining - 1 };
            });
          }, 1000);
          
          setTimer(intervalId);
        }
      }
    } catch (error) {
      console.error("Failed to fetch quiz:", error);
      toast({
        title: "Error",
        description: "Failed to load quiz. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      setGenerating(true);
      
      // Make sure we have a subject
      const quizSubject = subject || "General Knowledge";
      const quizLevel = level || "intermediate";
      
      console.log(`Generating quiz for subject: ${quizSubject}, level: ${quizLevel}, courseId: ${courseId}`);
      
      const response = await generateQuiz(quizSubject, quizLevel, courseId);
      
      if (response && response.quiz) {
        const quiz = response.quiz;
        console.log("Quiz generated successfully:", quiz);
        
        // Check if the quiz is already completed
        if (quiz.completed) {
          console.log("Quiz is already completed, showing results");
          setQuizState({
            id: quiz.id,
            questions: quiz.questions,
            currentQuestion: 0,
            selectedAnswers: new Array(quiz.questions.length).fill(""),
            timeRemaining: 0,
            quizCompleted: true,
            score: quiz.score,
            results: quiz.results,
          });
          
          toast({
            title: "Quiz Results",
            description: `You previously scored ${quiz.score} out of ${quiz.questions.length}!`,
          });
        } else {
          console.log("Setting up new quiz with", quiz.questions.length, "questions");
          setQuizState({
            id: quiz.id,
            questions: quiz.questions,
            currentQuestion: 0,
            selectedAnswers: new Array(quiz.questions.length).fill(""),
            timeRemaining: quiz.questions.length * 30, // 30 seconds per question
            quizCompleted: false,
            score: null,
            results: null,
          });

          // Start the timer
          const intervalId = setInterval(() => {
            setQuizState((prev) => {
              if (prev.timeRemaining <= 1) {
                clearInterval(intervalId);
                // Auto-submit when time runs out
                handleSubmitQuiz(prev.selectedAnswers);
                return { ...prev, timeRemaining: 0 };
              }
              return { ...prev, timeRemaining: prev.timeRemaining - 1 };
            });
          }, 1000);

          setTimer(intervalId);
        }
      }
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      toast({
        title: "Error",
        description: "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleSelectAnswer = (answer: string) => {
    setQuizState((prev) => {
      const newSelectedAnswers = [...prev.selectedAnswers];
      newSelectedAnswers[prev.currentQuestion] = answer;
      return { ...prev, selectedAnswers: newSelectedAnswers };
    });
  };

  const handleNextQuestion = () => {
    setQuizState((prev) => ({
      ...prev,
      currentQuestion: Math.min(prev.currentQuestion + 1, prev.questions.length - 1),
    }));
  };

  const handlePrevQuestion = () => {
    setQuizState((prev) => ({
      ...prev,
      currentQuestion: Math.max(prev.currentQuestion - 1, 0),
    }));
  };

  const handleSubmitQuiz = async (answers = quizState.selectedAnswers) => {
    try {
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }

      // Check if all questions are answered
      const unansweredQuestions = answers.filter((a) => a === "").length;
      if (unansweredQuestions > 0 && !window.confirm(`You have ${unansweredQuestions} unanswered questions. Are you sure you want to submit?`)) {
        return;
      }

      const response = await submitQuiz(quizState.id, answers);
      
      setQuizState((prev) => ({
        ...prev,
        quizCompleted: true,
        score: response.score,
        results: response.results,
      }));

      toast({
        title: "Quiz Submitted",
        description: `You scored ${response.score} out of ${quizState.questions.length}!`,
      });
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="pt-24 px-4 max-w-6xl mx-auto">
          <div className="flex flex-col justify-center items-center h-[60vh]">
            <div className="animate-spin h-12 w-12 border-4 border-purple-500 rounded-full border-t-transparent mb-4"></div>
            <p className="text-xl">
              {generating ? "Generating quiz questions..." : "Loading quiz..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (quizState.quizCompleted && quizState.results) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="pt-24 px-4 max-w-6xl mx-auto">
          <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold">Quiz Results</h1>
              <button
                onClick={() => navigate("/my-courses")}
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
              >
                <ArrowLeft size={20} /> Back to Courses
              </button>
            </div>

            <div className="flex flex-col items-center mb-8">
              <div className="bg-purple-900/30 p-6 rounded-full mb-4">
                <Trophy size={64} className="text-yellow-400" />
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {quizState.score} / {quizState.questions.length}
              </h2>
              <p className="text-lg text-gray-400">
                {quizState.score === quizState.questions.length
                  ? "Perfect Score! 🎉"
                  : quizState.score! > quizState.questions.length / 2
                  ? "Good Job! 👍"
                  : "Keep Practicing! 💪"}
              </p>
            </div>

            <div className="space-y-6">
              {quizState.results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    result.isCorrect ? "bg-green-900/20" : "bg-red-900/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.isCorrect ? (
                      <CheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                    ) : (
                      <XCircle className="text-red-500 mt-1 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium mb-2">
                        Question {index + 1}: {result.question}
                      </p>
                      <p className="text-sm text-gray-400 mb-1">
                        Your answer:{" "}
                        <span
                          className={
                            result.isCorrect ? "text-green-400" : "text-red-400"
                          }
                        >
                          {result.userAnswer || "(No answer)"}
                        </span>
                      </p>
                      {!result.isCorrect && (
                        <p className="text-sm text-green-400">
                          Correct answer: {result.correctAnswer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => navigate("/my-courses")}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition"
              >
                Back to Courses
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
              >
                View Progress
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-24 px-4 max-w-6xl mx-auto">
        <div className="bg-gray-900 rounded-xl p-6 shadow-md border border-purple-500/30">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">
              {subject} Quiz
            </h1>
            <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
              <Clock size={20} className="text-purple-400" />
              <span className="font-mono text-lg">
                {formatTime(quizState.timeRemaining)}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span>
                Question {quizState.currentQuestion + 1} of{" "}
                {quizState.questions.length}
              </span>
              <span>
                {quizState.selectedAnswers.filter((a) => a !== "").length} of{" "}
                {quizState.questions.length} answered
              </span>
            </div>
            <Progress
              value={
                ((quizState.currentQuestion + 1) / quizState.questions.length) *
                100
              }
              className="h-2 bg-gray-700"
            />
          </div>

          {quizState.questions.length > 0 && (
            <div className="mb-8">
              <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h2 className="text-xl font-medium mb-4">
                  {quizState.questions[quizState.currentQuestion].question}
                </h2>
                <div className="space-y-3">
                  {quizState.questions[quizState.currentQuestion].options.map(
                    (option, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectAnswer(option)}
                        className={`w-full text-left p-4 rounded-lg transition ${
                          quizState.selectedAnswers[quizState.currentQuestion] ===
                          option
                            ? "bg-purple-700 text-white"
                            : "bg-gray-700 hover:bg-gray-600 text-gray-100"
                        }`}
                      >
                        {option}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handlePrevQuestion}
                  disabled={quizState.currentQuestion === 0}
                  className={`px-4 py-2 rounded-lg ${
                    quizState.currentQuestion === 0
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  Previous
                </button>

                {quizState.currentQuestion < quizState.questions.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmitQuiz()}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                  >
                    Submit Quiz
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {quizState.questions.map((_, index) => (
              <button
                key={index}
                onClick={() =>
                  setQuizState((prev) => ({ ...prev, currentQuestion: index }))
                }
                className={`w-full aspect-square flex items-center justify-center rounded-lg text-sm font-medium ${
                  index === quizState.currentQuestion
                    ? "bg-purple-600 text-white"
                    : quizState.selectedAnswers[index]
                    ? "bg-gray-600 text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
