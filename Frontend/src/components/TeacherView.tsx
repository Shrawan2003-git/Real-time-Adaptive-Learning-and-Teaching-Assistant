
import React, { useState } from 'react';
import { LessonData } from '../types';
import { generateLessonPlan, generateLessonImage } from '../services/geminiService';
import { startBroadcast } from '../services/classroomSync';
import { Button } from './Button';
import { BookOpen, AlertTriangle, Share2, Sparkles, Image as ImageIcon, Clock, X, Info, LogOut, Download } from 'lucide-react';
import { SessionHistory } from './SessionHistory';
import html2pdf from 'html2pdf.js';

interface TeacherViewProps {
  onLessonCreated: (lesson: LessonData) => void;
  onBack: () => void;
  onLogout?: () => void;
}


export const TeacherView: React.FC<TeacherViewProps> = ({ onBack, onLessonCreated, onLogout }) => {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('High School');
  const [broadcastSessionId, setBroadcastSessionId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [language, setLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState('');
  const [generatedLesson, setGeneratedLesson] = useState<LessonData | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState('');

  // We no longer subscribe to doubts here, as this is just the generation hub.

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError('');
    setGeneratedLesson(null);

    try {
      const data = await generateLessonPlan(topic, level, language);
      setGeneratedLesson(data);
      setCustomImagePrompt(data.imagePrompt);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Failed to generate lesson content.';

      // Simplify Google API errors
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        msg = "⚠️ High Traffic: The AI server is currently busy. Please wait 10-20 seconds and try again.";
      } else if (msg.includes('API Key')) {
        msg = "Configuration Error: API Key is missing or invalid. Please check your settings.";
      } else if (msg.includes('JSON')) {
        msg = "AI Response System Error. Please try again (the model returned invalid format).";
      }

      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!generatedLesson) return;
    setIsGeneratingImage(true);
    try {
      const base64Image = await generateLessonImage(customImagePrompt);
      const updatedLesson = {
        ...generatedLesson,
        imageUrl: base64Image,
        imagePrompt: customImagePrompt // Save prompt back to lesson
      };
      setGeneratedLesson(updatedLesson);
    } catch (err: any) {
      console.error(err);
      let msg = 'Failed to generate image.';
      if (err.message?.includes('Imagen') || err.message?.includes('404')) {
        msg = 'Image generation model (Imagen 3) not found or not enabled for this API key.';
      }
      setError(msg);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('lesson-content-preview');
    if (!element) return;
    const opt = {
      margin: 1,
      filename: `${generatedLesson?.topic || 'Lesson'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePublish = async () => {
    if (generatedLesson) {
      try {
        const teacherName = prompt("Enter your name for the broadcast:", "Prof. Smith");
        if (!teacherName) return;

        setIsPublishing(true);
        setError(''); // Clear past errors
        const sessionId = await startBroadcast(generatedLesson, teacherName);
        setBroadcastSessionId(sessionId);
      } catch (err: any) {
        console.error("Broadcast failed:", err);
        const errorMsg = "Database Error: " + (err.message || "Make sure your Firebase Rules are set to 'test mode'.");
        setError(errorMsg);
        alert(`Failed to broadcast!\n\n${errorMsg}\n\nPlease check your Firebase Database Rules.`);
      } finally {
        setIsPublishing(false);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-500">Create adaptive AI-powered lessons in seconds.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setShowHistoryModal(true)} icon={<Clock className="w-4 h-4" />}>
            History
          </Button>
          <Button variant="outline" onClick={onBack}>Back to Home</Button>
          {onLogout && (
            <Button variant="outline" onClick={onLogout} className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" icon={<LogOut className="w-4 h-4" />}>
              Logout
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Lesson Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Subject</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. The Water Cycle, Macbeth, Quantum Physics"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:border-transparent outline-none transition-all duration-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 outline-none transition-all duration-300"
                  >
                    <option>Elementary School</option>
                    <option>Middle School</option>
                    <option>High School</option>
                    <option>Undergraduate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 outline-none appearance-none transition-all duration-300"
                    >
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                      <option>Mandarin</option>
                      <option>Japanese</option>
                      <option>Hindi</option>
                    </select>
                    {/* <Globe className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" /> */}
                  </div>
                </div>
              </div>

            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                isLoading={isGenerating}
                disabled={!topic.trim()}
                className="w-full text-lg h-12 shadow-md hover:shadow-lg active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-300"
                icon={<Sparkles className="w-5 h-5" />}
              >
                Generate Lesson Content
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          {generatedLesson && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 animate-slide-up">
              <h3 className="font-semibold text-indigo-900 mb-2">Multimedia Assets</h3>

              <div className="mb-4">
                <label className="block text-xs font-medium text-indigo-700 mb-1">Diagram Prompt</label>
                <div className="flex flex-col gap-2">
                  <textarea
                    value={customImagePrompt}
                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 outline-none resize-none transition-all duration-300"
                    rows={2}
                  />
                  {!generatedLesson.imageUrl ? (
                    <Button
                      variant="secondary"
                      onClick={handleGenerateImage}
                      isLoading={isGeneratingImage}
                      className="w-full text-xs active:scale-[0.98] transition-transform"
                      icon={<ImageIcon className="w-4 h-4" />}
                    >
                      Generate Diagram
                    </Button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 flex items-center gap-2 text-green-700 font-medium bg-green-100 px-3 py-2 rounded-lg text-xs">
                        <Sparkles className="w-3 h-3" /> Diagram Ready
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleGenerateImage}
                        isLoading={isGeneratingImage}
                        className="text-xs bg-white whitespace-nowrap active:scale-[0.98] transition-transform hover:bg-gray-50"
                        disabled={customImagePrompt === generatedLesson.imagePrompt}
                      >
                        Re-generate
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 h-full min-h-[500px] flex flex-col">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Content Preview</h2>

          {!generatedLesson ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              {isGenerating ? (
                <>
                  <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="font-medium text-indigo-600">AI is crafting your perfect lesson...</p>
                </>
              ) : (
                <>
                  <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                  <p>Generated content will appear here</p>
                </>
              )}
            </div>
          ) : (
            <div id="lesson-content-preview" className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-slide-up">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-2xl text-gray-900 leading-tight">{generatedLesson.topic}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold shadow-sm">{language}</span>
                </div>
                <p className="text-gray-700 text-base leading-relaxed">{generatedLesson.summary}</p>
              </div>

              {generatedLesson.imageUrl && (
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 animate-slide-up animation-delay-100">
                  <img
                    src={generatedLesson.imageUrl.startsWith('data:') || generatedLesson.imageUrl.startsWith('http') ? generatedLesson.imageUrl : `data: image / jpeg; base64, ${generatedLesson.imageUrl} `}
                    alt="Generated visual"
                    className="w-full rounded-md object-contain max-h-[400px]"
                  />
                </div>
              )}

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-slide-up animation-delay-200">
                <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                    {generatedLesson.quiz.length}
                  </span>
                  Quiz Questions Preview
                </h4>
                <ul className="space-y-4">
                  {generatedLesson.quiz.map((q, i) => (
                    <li key={i} className="text-sm border flex flex-col gap-1 border-gray-100 p-4 rounded-xl hover:translate-x-2 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all duration-300 cursor-default bg-gray-50/50">
                      <p className="font-semibold text-gray-900">{i + 1}. {q.question}</p>
                      <p className="text-gray-500 text-xs">Answer: {q.options[q.correctAnswer]}</p>
                      <p className="text-amber-600 text-xs mt-1">Adaptive Hint: {q.hint}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {generatedLesson && (
            <div className="pt-6 mt-auto border-t border-gray-200">
              <div className="flex gap-3 mb-3">
                <Button
                  variant="secondary"
                  onClick={handleDownloadPDF}
                  icon={<Download className="w-5 h-5" />}
                  className="flex-1 text-lg h-12 shadow-sm hover:shadow active:scale-[0.98] transition-all"
                >
                  Download Lesson PDF
                </Button>
              </div>
              <div className="flex gap-3">
                {broadcastSessionId ? (
                  <a
                    href={`/#/teacher-live/${broadcastSessionId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex justify-center items-center text-lg h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-colors gap-2"
                  >
                    <Share2 className="w-5 h-5" /> Broadcast Alive! Click here to Open Teacher Dashboard
                  </a>
                ) : (
                  <Button
                    onClick={handlePublish}
                    isLoading={isPublishing}
                    className="flex-1 text-lg h-12 bg-green-600 hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow active:scale-[0.98] transition-all"
                    icon={<Share2 className="w-5 h-5" />}
                  >
                    Broadcast Lesson
                  </Button>
                )}
              </div>
              <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                <Info className="w-5 h-5 shrink-0" />
                <p>
                  Broadcasting will open a <strong>new tab</strong> with your Live Session Control Center,
                  allowing you to monitor doubts and manage the session without losing your current work here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session History Modal */}
      {
        showHistoryModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Teacher Session History
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <SessionHistory
                  onSelectSession={(historyLesson) => {
                    setGeneratedLesson(historyLesson);
                    setShowHistoryModal(false);
                  }}
                />
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};