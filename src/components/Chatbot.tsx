 import React, { useState, useEffect } from 'react';
import './Chatbot.css';
import { X } from 'lucide-react';
import chatbotIcon from '../assets/chatbot icon.png';

interface Message {
  text: string;
  isBot: boolean;
  type?: 'text' | 'image';  // Added to distinguish between text and image messages
  imageUrl?: string;        // Added to store image URLs
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showWelcomeBubble, setShowWelcomeBubble] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId] = useState<string>(() => `session_${Date.now()}`);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const latestBotMessageRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].isBot) {
      setTimeout(() => {
        latestBotMessageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      setShowWelcomeBubble(true);
    }, 2000);

    return () => clearTimeout(welcomeTimer);
  }, []);

  const getAIResponse = async (message: string, image?: File | null): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('message', message);
      
      if (image) {
        formData.append('image', image);
      }

      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error getting AI response:', error);
      return "I apologize, but I'm having trouble processing your request at the moment. Please try again.";
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      setSelectedImage(file);
      // Add visual feedback that image was selected
      setInput(`Uploaded image: ${file.name}`);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleQuestionClick = async (question: string) => {
    setMessages([...messages, { text: question, isBot: false }]);
    setIsLoading(true);

    const response = await getAIResponse(question);
    
    setIsLoading(false);
    setMessages(prev => [...prev, {
      text: response,
      isBot: true
    }]);
  };

  const handleSend = async () => {
    if (input.trim() || selectedImage) {
      const userMessage = input.trim();
      let userMessageObj: Message = { text: userMessage, isBot: false, type: 'text' };
      
      if (selectedImage) {
        const imageUrl = URL.createObjectURL(selectedImage);
        userMessageObj = {
          ...userMessageObj,
          type: 'image',
          imageUrl,
          text: userMessage || 'Image uploaded'
        };
      }

      setMessages([...messages, userMessageObj]);
      setInput('');
      setIsLoading(true);

      const response = await getAIResponse(userMessage, selectedImage);
      setSelectedImage(null);
      
      setIsLoading(false);
      setMessages(prev => [...prev, {
        text: response,
        isBot: true,
        type: 'text'
      }]);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    setShowWelcomeBubble(false);

    if (!isOpen && messages.length === 0) {
      setMessages([
        {
          text: "Hi! I'm ADR Predict Assistant 👋 I can help you understand our drug reaction prediction capabilities. How can I assist you today?",
          isBot: true
        }
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  return (
    <div className="chatbot-container" role="complementary" aria-label="Chat assistant">
      <div className={`chatbot ${isOpen ? 'open' : ''}`}>
        {!isOpen ? (
          <>
            <div 
              className={`chatbot-icon ${showWelcomeBubble ? 'pulse' : ''}`} 
              onClick={toggleChatbot}
              role="button"
              aria-label="Open chat assistant"
              tabIndex={0}
            >
              <img src={chatbotIcon} alt="Chat with ADR Predict Assistant" width={30} height={30} />
            </div>
            {showWelcomeBubble && (
              <div className="welcome-bubble" role="alert">
                Hi! I'm ADR Predict Assistant 👋 I can help you understand drug safety and adverse reactions. Click to get started!
              </div>
            )}
          </>
        ) : (
          <>
            <div className="chatbot-header">
              <h3>ADR Predict Assistant</h3>
              <button 
                className="close-button" 
                onClick={toggleChatbot}
                aria-label="Close chat"
              >
                <X size={24} />
              </button>
            </div>
            <div className="chatbot-content">
              <div className="chatbot-questions">
                <h4>Common Questions:</h4>
                <button
                  onClick={() => !isLoading && handleQuestionClick("What is ADR Predict and how does it work?")}
                  className="question-button"
                  disabled={isLoading}
                >
                  What is ADR Predict and how does it work?
                </button>
                <button
                  onClick={() => !isLoading && handleQuestionClick("What features and capabilities does ADR Predict offer?")}
                  className="question-button"
                  disabled={isLoading}
                >
                  What features and capabilities does ADR Predict offer?
                </button>
                <button
                  onClick={() => !isLoading && handleQuestionClick("How does ADR Predict improve healthcare safety?")}
                  className="question-button"
                  disabled={isLoading}
                >
                  How does ADR Predict improve healthcare safety?
                </button>
                <button
                  onClick={() => !isLoading && handleQuestionClick("How can healthcare providers implement ADR Predict?")}
                  className="question-button"
                  disabled={isLoading}
                >
                  How can healthcare providers implement ADR Predict?
                </button>
              </div>
              <div
                className="chatbot-messages"
                role="log"
                aria-live="polite"
              >
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    ref={index === messages.length - 1 && msg.isBot ? latestBotMessageRef : null}
                    className={`chatbot-message ${msg.isBot ? 'bot' : 'user'}`}
                    role={msg.isBot ? 'status' : 'comment'}
                  >
                    {msg.type === 'image' && msg.imageUrl && (
                      <div className="message-image">
                        <img src={msg.imageUrl} alt="Uploaded content" style={{ maxWidth: '200px', marginBottom: '8px' }} />
                      </div>
                    )}
                    {msg.text}
                  </div>
                ))}
                {isLoading && (
                  <div className="chatbot-message bot loading">
                    Thinking...
                  </div>
                )}
              </div>
            </div>
            <div className="chatbot-input">
              <div className="input-container">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your question about ADR Predict..."
                  aria-label="Type your message"
                  disabled={isLoading}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                  aria-label="Upload image"
                />
                <button
                  onClick={handleImageClick}
                  className="image-upload-button"
                  aria-label="Upload image"
                  disabled={isLoading}
                >
                  📷
                </button>
                <button
                  onClick={handleSend}
                  aria-label="Send message"
                  disabled={isLoading}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Chatbot;