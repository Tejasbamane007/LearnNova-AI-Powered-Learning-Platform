import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { sendChatMessage } from '../utils/api';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean;
  isError?: boolean;
}

interface ChatBotProps {
  visible?: boolean;
  subject?: string;
  level?: string;
}

const ChatBot = ({ visible = false, subject = '', level = '' }: ChatBotProps) => {
  const [isOpen, setIsOpen] = useState(visible);
  const [messages, setMessages] = useState<Message[]>([
    {
      text: `👋 Hello! I'm your AI study assistant. Ask me anything about ${subject || 'your course'}.`,
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Update initial message when subject changes
  useEffect(() => {
    if (subject) {
      setMessages([
        {
          text: `👋 Hello! I'm your AI study assistant for ${subject} (${level || 'all levels'}). 
          
You can ask me to:
• Explain difficult concepts
• Provide examples
• Give study tips
• Answer specific questions`,
          isUser: false,
          timestamp: new Date()
        }
      ]);
    }
  }, [subject, level]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update visibility based on props
  useEffect(() => {
    setIsOpen(visible);
  }, [visible]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const userQuestion = inputValue;
    setInputValue('');
    
    // Add a "typing" indicator message
    const typingMessage: Message = {
      text: "Thinking...",
      isUser: false,
      timestamp: new Date(),
      isTyping: true
    };
    
    setMessages(prev => [...prev, typingMessage]);
    
    try {
      // Send the message to the backend API
      const responseText = await sendChatMessage(userQuestion);
      
      // Remove the typing indicator and add the real response
      setMessages(prev => {
        // Filter out the typing indicator
        const filteredMessages = prev.filter(msg => !msg.isTyping);
        
        // Add the new AI response
        return [...filteredMessages, {
          text: responseText,
          isUser: false,
          timestamp: new Date()
        }];
      });
    } catch (error) {
      console.error("❌ Error getting chatbot response:", error);
      
      // Remove the typing indicator and add an error message
      setMessages(prev => {
        // Filter out the typing indicator
        const filteredMessages = prev.filter(msg => !msg.isTyping);
        
        // Add the error message
        return [...filteredMessages, {
          text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`,
          isUser: false,
          timestamp: new Date(),
          isError: true
        }];
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-[#1e1e2e] rounded-xl shadow-xl flex flex-col overflow-hidden z-50 border border-purple-500/30">
      {/* Header */}
      <div className="bg-purple-600 px-4 py-3 flex justify-between items-center">
        <h3 className="text-white font-semibold flex items-center">
          <MessageSquare size={16} className="mr-2" /> 
          AI Study Assistant
        </h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white"
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.isUser 
                  ? 'bg-purple-600 text-white' 
                  : message.isError
                    ? 'bg-red-800 text-gray-200'
                    : 'bg-gray-800 text-gray-200'
              }`}
            >
              {message.isTyping ? (
                <div className="flex items-center space-x-1 py-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              ) : (
                <>
                  <div className="whitespace-pre-line">{message.text}</div>
                  <p className="text-xs opacity-70 mt-1 text-right">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="border-t border-gray-700 p-3 flex">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about this subject..."
          className="flex-1 bg-gray-800 text-white rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim()}
          className={`${inputValue.trim() ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600/50 cursor-not-allowed'} text-white px-4 rounded-r-lg transition-colors`}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatBot;