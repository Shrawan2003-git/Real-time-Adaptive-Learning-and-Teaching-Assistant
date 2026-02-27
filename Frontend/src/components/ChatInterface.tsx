import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Mic, ImageIcon, X } from 'lucide-react';
import { ChatMessage, LessonData } from '../types';
import { chatWithTutor } from '../services/geminiService';
import { LiveVoiceMode } from './LiveVoiceMode';

interface ChatInterfaceProps {
  lesson: LessonData;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ lesson }) => {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: `Hi! I'm your VTA. We're learning about ${lesson.topic} today. Upload a photo if you need help with a diagram!`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, mode]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isTyping) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: input,
      image: selectedImage || undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const currentImage = selectedImage;
    setSelectedImage(null);
    setIsTyping(true);

    try {
      // Format history for Gemini API
      const history = messages.map(m => {
        const parts: any[] = [{ text: m.text || '' }];
        if (m.image) {
          const cleanBase64 = m.image.includes(',') ? m.image.split(',')[1] : m.image;
          parts.unshift({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
        }
        return {
          role: m.role,
          parts
        };
      });

      const context = `Topic: ${lesson.topic}. Summary: ${lesson.summary}. Key Points: ${lesson.keyPoints.join('; ')}`;
      const responseText = await chatWithTutor(history, userMsg.text || 'Analyze this image', context, currentImage || undefined);

      // Check for image generation command
      if (responseText.includes('[GENERATE_IMAGE:')) {
        const match = responseText.match(/\[GENERATE_IMAGE:\s*(.*?)\]/);
        if (match && match[1]) {
          const prompt = match[1];
          // Add a placeholder message
          setMessages(prev => [...prev, { role: 'model', text: "Sure! Generating that diagram for you...", timestamp: new Date() }]);

          try {
            // Determine API key from env if not passed explicitly (client-side)
            // In Vite, process.env.API_KEY should be replaced. 
            // If checking fails, we might need to pass it from App props.
            const { generateLessonImage } = await import('../services/geminiService');
            const imageUrl = await generateLessonImage(prompt);

            setMessages(prev => [...prev, {
              role: 'model',
              text: "Here is the diagram:",
              image: imageUrl,
              timestamp: new Date()
            }]);
          } catch (imgErr) {
            console.error("Chat image generation failed:", imgErr);
            setMessages(prev => [...prev, { role: 'model', text: "I tried to generate the image but something went wrong.", timestamp: new Date() }]);
          }
          return; // Exit as we handled the response
        }
      }

      const botMsg: ChatMessage = {
        role: 'model',
        text: responseText || "I'm having trouble connecting right now. Try again?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      console.error(error);
      let errorMsg = "Sorry, I encountered an error processing your request.";
      if (error.message?.includes('API Key')) {
        errorMsg = "Configuration Error: API Key is missing. Please restart the application or check your .env.local file.";
      }
      setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (mode === 'voice') {
    return (
      <div className="h-[500px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <LiveVoiceMode
          context={`Topic: ${lesson.topic}. Summary: ${lesson.summary}. Key Points: ${lesson.keyPoints.join('; ')}`}
          onClose={() => setMode('text')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Virtual Tutor</h3>
        </div>
        <button
          onClick={() => setMode('voice')}
          className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors font-medium"
        >
          <Mic className="w-3 h-3" /> Voice Mode
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100' : 'bg-blue-100'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-indigo-600" /> : <Bot className="w-4 h-4 text-blue-600" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user'
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}>
              {msg.image && (
                <img src={msg.image} alt="User upload" className="max-w-full h-auto rounded-lg mb-2" />
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-none p-3 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {selectedImage && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={selectedImage} alt="Preview" className="w-10 h-10 object-cover rounded" />
            <span className="text-xs text-gray-500">Image attached</span>
          </div>
          <button onClick={() => setSelectedImage(null)} className="text-gray-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageSelect}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type or upload an image..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isTyping}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};