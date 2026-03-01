
import React, { useState } from 'react';
import { LessonData } from '../types';
import { generateLessonPlan, generateLessonImage, generateLessonSummaryStream, generateLessonMetadata } from '../services/geminiService';
import { startBroadcast, subscribeToActiveSessions, ActiveSession } from '../services/classroomSync';
import { auth } from '../services/firebase';
import { Button } from './Button';
import { BookOpen, AlertTriangle, Share2, Sparkles, Image as ImageIcon, Clock, X, Info, LogOut, Download } from 'lucide-react';
import { SessionHistory } from './SessionHistory';
import html2pdf from 'html2pdf.js';
import { renderMarkdown } from '../utils/markdownUtils';

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
  const [streamingSummary, setStreamingSummary] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  React.useEffect(() => {
    const unsub = subscribeToActiveSessions((sessions) => {
      // Filter sessions belonging to current teacher if possible, or just show all for demo
      const mySessions = sessions.filter(s => s.teacherName === auth.currentUser?.displayName || (s.teacherName && !auth.currentUser?.displayName));
      setActiveSessions(sessions); // or mySessions if we had strict auth
    });
    return () => unsub();
  }, []);

  // We no longer subscribe to doubts here, as this is just the generation hub.

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError('');
    setGeneratedLesson(null);
    setStreamingSummary('');

    try {
      // Phase 1: Stream the summary character by character
      const fullSummary = await generateLessonSummaryStream(topic, level, language, (chunk) => {
        setStreamingSummary(chunk);
      });

      // Phase 2: Fetch structured metadata based on the generated summary
      const metadata = await generateLessonMetadata(topic, level, language, fullSummary);

      const completeLesson: LessonData = {
        topic,
        level,
        summary: fullSummary,
        ...metadata,
      };

      setGeneratedLesson(completeLesson);
      setCustomImagePrompt(metadata.imagePrompt);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Failed to generate lesson content.';

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
      setStreamingSummary('');
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
    <div className="min-h-screen bg-gradient-to-r from-[#fdfbf7] via-emerald-50/30 to-indigo-950/40 relative overflow-hidden py-10 px-4 transition-colors duration-1000 font-inter">
      {/* Immersive Animated Premium Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-blue-300/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-200"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[50%] bg-purple-300/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-400"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]"></div>
      </div>

      <div className="max-w-5xl mx-auto flex items-center justify-between mb-8 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-inter tracking-tight">Teacher Dashboard</h1>
          <p className="text-gray-600 mt-1 font-medium">Create adaptive AI-powered lessons in seconds.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowHistoryModal(true)} icon={<Clock className="w-4 h-4" />} className="bg-white/60 backdrop-blur hover:bg-white text-gray-800 border-gray-300 font-playfair font-semibold text-lg tracking-wide shadow-sm hover:shadow">
            Traditional History
          </Button>
          <Button variant="outline" onClick={onBack} className="bg-white/60 backdrop-blur hover:bg-white text-gray-700 border-gray-300 font-semibold shadow-sm hover:shadow">
            Back to Home
          </Button>
          {onLogout && (
            <Button variant="outline" onClick={onLogout} className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" icon={<LogOut className="w-4 h-4" />}>
              Logout
            </Button>
          )}
        </div>
      </div>

      {activeSessions.length > 0 && !broadcastSessionId && (
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-4 mb-8 text-white flex items-center justify-between shadow-lg relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex flex-col items-center justify-center shrink-0">
              <span className="w-3 h-3 bg-red-100 rounded-full animate-pulse"></span>
            </div>
            <div>
              <h3 className="font-bold">You have an Active Session!</h3>
              <p className="text-red-100 text-sm">Don't create a new one unless you intend to.</p>
            </div>
          </div>
          <a
            href={`/#/teacher-live/${activeSessions[0].sessionId}`}
            className="px-4 py-2 bg-white text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors shadow-sm"
          >
            Resume Console
          </a>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 relative z-10 w-full px-4 xl:px-0">

        {/* Left Column: Configuration and Content Preview */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Input Section */}
          <div className="dashboard-card p-8 md:p-10 w-full transition-transform duration-300">
            <h2 className="text-xl font-extrabold mb-6 text-gray-800 flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 rounded-full bg-purple-100/60 flex items-center justify-center shadow-inner ring-1 ring-purple-200/50">
                <Sparkles className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
              </div>
              Lesson Configuration
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide opacity-90">Topic / Subject</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. The Water Cycle, Macbeth, Quantum Physics"
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-[#00E5FF]/30 focus:border-[#00E5FF] outline-none transition-all duration-300 shadow-sm placeholder-slate-400 font-medium text-gray-900 bg-white/80 backdrop-blur-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide opacity-90">Grade Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-4 focus:ring-[#00E5FF]/30 focus:border-[#00E5FF] outline-none transition-all duration-300 cursor-pointer text-gray-900 font-medium font-sans shadow-sm"
                  >
                    <option>Elementary School</option>
                    <option>Middle School</option>
                    <option>High School</option>
                    <option>Undergraduate</option>
                    <option>Post Graduate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide opacity-90">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-4 focus:ring-[#00E5FF]/30 focus:border-[#00E5FF] outline-none transition-all duration-300 cursor-pointer text-gray-900 font-medium font-sans shadow-sm"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Mandarin</option>
                    <option>Japanese</option>
                    <option>Hindi</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <Button
                onClick={handleGenerate}
                isLoading={isGenerating}
                disabled={!topic.trim()}
                className="relative w-full text-lg font-bold h-14 active:scale-[0.99] transition-all duration-300 border-none justify-center overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #9333ea 0%, #00E5FF 100%)',
                  boxShadow: '0 4px 15px rgba(0, 229, 255, 0.4)',
                  color: 'white'
                }}
                icon={<Sparkles className="w-5 h-5 relative z-10" />}
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                {/* Shimmer Effect */}
                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] group-hover:animate-shimmer z-0"></div>
                <span className="relative z-10">Generate Magical Lesson</span>
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2 mt-4 border border-red-100">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}
          </div>

          {/* Content Preview Section */}
          <div className="dashboard-card p-6 md:p-8 flex flex-col relative overflow-hidden transition-all duration-500 flex-1 sticky top-6 h-[calc(100vh-100px)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-80"></div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-6 flex items-center gap-4 pb-4 border-b border-gray-100 shrink-0">
              <div className="w-12 h-12 rounded-full bg-blue-100/60 flex items-center justify-center shadow-inner ring-1 ring-blue-200/50">
                <BookOpen className="w-6 h-6 text-[#00E5FF]" strokeWidth={2.5} />
              </div>
              Teaching Material Preview
            </h2>

            {!generatedLesson && !isGenerating && !streamingSummary ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <BookOpen className="w-20 h-20 mb-4 opacity-10" />
                <p className="text-lg font-medium text-gray-400">Content will render here beautifully</p>
                <p className="text-sm mt-2 opacity-60">Generate a lesson to get started</p>
              </div>
            ) : isGenerating && !generatedLesson ? (
              <div id="lesson-content-preview" className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                <div className="bg-white/80 p-6 rounded-2xl shadow-lg border border-[#00E5FF]/20 animate-slide-up relative overflow-hidden">

                  {/* Evolution Progress Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-900 via-purple-500 to-[#00E5FF] w-[60%] animate-pulse relative">
                      {/* Laser Glint */}
                      <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white to-transparent opacity-70 blur-[2px]"></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-start mb-4 mt-2">
                    <h3 className="font-extrabold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-blue-800 leading-tight">Digital Evolution in Progress...</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-200 border-t-[#00E5FF] rounded-full animate-spin"></div>
                      <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest shadow-sm animate-pulse border border-blue-100">Live Stream</span>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-gray-100/50 pt-6 relative">
                    <div className="prose prose-blue prose-lg max-w-none text-gray-700">
                      {renderMarkdown(streamingSummary)}
                    </div>
                    <span className="inline-block w-2.5 h-6 bg-[#00E5FF] animate-pulse ml-1.5 align-middle rounded-sm shadow-[0_0_8px_rgba(0,229,255,0.8)]"></span>
                  </div>
                </div>
              </div>
            ) : generatedLesson ? (
              <div id="lesson-content-preview" className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 animate-slide-up min-h-full">
                  <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100 flex-col md:flex-row gap-4">
                    <h3 className="font-bold text-3xl text-gray-900 leading-tight">{generatedLesson.topic}</h3>
                    <span className="text-sm bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full font-bold uppercase tracking-wider border border-indigo-100 whitespace-nowrap">{language}</span>
                  </div>
                  <div className="prose prose-indigo prose-lg max-w-none">
                    {renderMarkdown(generatedLesson.summary)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Sidebar: Actions & Metadata elements */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {!generatedLesson && !isGenerating && (
            <div className="dashboard-card p-6 flex flex-col text-gray-400 h-full min-h-[500px] overflow-hidden relative border border-[#00E5FF]/20">
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>

              <h3 className="font-bold text-gray-300 mb-6 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Awaiting Content
              </h3>

              {/* Fake Skeleton UI to show users what will appear here */}
              <div className="space-y-6 flex-1 opacity-40">
                {/* Skeleton Card 1 */}
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded-md w-1/3"></div>
                  <div className="h-10 bg-gray-100 rounded-xl w-full"></div>
                  <div className="h-10 bg-gray-100 rounded-xl w-full"></div>
                </div>

                {/* Skeleton Card 2 */}
                <div className="space-y-3 pt-4 border-t border-gray-100 w-full">
                  <div className="h-4 bg-gray-200 rounded-md w-1/4 mb-4"></div>
                  <div className="h-24 bg-gray-100 rounded-xl w-full"></div>
                  <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
                </div>

                {/* Skeleton Card 3 */}
                <div className="space-y-3 pt-4 border-t border-gray-100 w-full">
                  <div className="flex gap-2 items-center mb-4">
                    <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                    <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
                  </div>
                  <div className="h-16 bg-gray-50 border border-gray-100 rounded-xl w-full"></div>
                  <div className="h-16 bg-gray-50 border border-gray-100 rounded-xl w-full"></div>
                </div>
              </div>
            </div>
          )}

          {generatedLesson && (
            <>
              {/* Actions Card */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-center animate-slide-up ring-1 ring-gray-900/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                <h4 className="font-bold text-lg text-gray-800 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3 relative z-10">
                  <Share2 className="w-5 h-5 text-indigo-500" /> Deployment Actions
                </h4>
                <div className="flex flex-col gap-3 mb-4 relative z-10">
                  <Button
                    variant="secondary"
                    onClick={handleDownloadPDF}
                    icon={<Download className="w-5 h-5" />}
                    className="w-full text-base font-semibold h-12 shadow-sm hover:shadow-md active:scale-[0.98] transition-all bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900"
                  >
                    Download PDF Material
                  </Button>
                </div>
                <div className="flex flex-col gap-3 relative z-10">
                  {broadcastSessionId ? (
                    <a
                      href={`/#/teacher-live/${broadcastSessionId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex justify-center items-center text-base font-bold h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all gap-2 hover:-translate-y-0.5"
                    >
                      <Share2 className="w-5 h-5" /> Open Active Portal
                    </a>
                  ) : (
                    <Button
                      onClick={handlePublish}
                      isLoading={isPublishing}
                      className="w-full text-base font-bold h-12 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-md hover:shadow-lg active:scale-[0.98] transition-all hover:-translate-y-0.5 text-white border-none"
                      icon={<Share2 className="w-5 h-5" />}
                    >
                      Broadcast Live Session
                    </Button>
                  )}
                </div>
                <div className="flex items-start gap-3 mt-5 p-3.5 bg-blue-50/80 text-blue-800 rounded-xl text-xs leading-relaxed border border-blue-100 relative z-10 backdrop-blur-sm">
                  <Info className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
                  <p>
                    Broadcasting triggers a live environment where students can securely join to read along and ask questions instantly.
                  </p>
                </div>
              </div>

              {/* Multimedia Card */}
              <div className="bg-gradient-to-b from-indigo-50/50 to-white border border-indigo-100 rounded-2xl p-6 animate-slide-up animation-delay-100 shadow-sm">
                <h4 className="font-bold text-lg text-indigo-900 mb-4 flex items-center gap-2 border-b border-indigo-100 pb-3">
                  <ImageIcon className="w-5 h-5 text-indigo-500" /> Visual Assets
                </h4>
                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-indigo-700 mb-2 uppercase tracking-widest opacity-80">AI Diagram Input</label>
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={customImagePrompt}
                      onChange={(e) => setCustomImagePrompt(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 outline-none resize-none transition-all duration-300 bg-white/70 shadow-inner"
                      rows={3}
                    />
                    {!generatedLesson.imageUrl ? (
                      <Button
                        variant="secondary"
                        onClick={handleGenerateImage}
                        isLoading={isGeneratingImage}
                        className="w-full text-sm font-bold h-10 active:scale-[0.98] transition-all bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md hover:shadow-lg"
                        icon={<Sparkles className="w-4 h-4" />}
                      >
                        Generate Smart Diagram
                      </Button>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-3 py-2.5 rounded-xl text-xs shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Ready to Show
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleGenerateImage}
                          isLoading={isGeneratingImage}
                          className="text-xs font-bold px-4 py-2 bg-white active:scale-[0.98] transition-all hover:bg-gray-50 border-gray-200 rounded-xl hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
                          disabled={customImagePrompt === generatedLesson.imagePrompt}
                        >
                          Re-roll
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {generatedLesson.imageUrl && (
                  <div className="mt-5 bg-white p-2 rounded-xl shadow-sm border border-gray-100 group relative overflow-hidden flex justify-center items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat">
                    <img
                      src={generatedLesson.imageUrl.startsWith('data:') || generatedLesson.imageUrl.startsWith('http') ? generatedLesson.imageUrl : `data:image/jpeg;base64,${generatedLesson.imageUrl}`}
                      alt="Generated visual"
                      className="w-full rounded-lg object-contain min-h-[150px] max-h-[300px] transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                )}
              </div>

              {/* Quiz Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-slide-up animation-delay-200 sticky top-6">
                <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                  <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                    {generatedLesson.quiz.length}
                  </span>
                  Pop Quiz Analytics
                </h4>
                <ul className="space-y-4">
                  {generatedLesson.quiz.map((q, i) => (
                    <li key={i} className="text-sm border flex flex-col gap-2 border-gray-100 p-4 rounded-xl hover:bg-gray-50/80 hover:border-indigo-100 transition-all duration-300 relative group overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <p className="font-semibold text-gray-900 leading-snug">{i + 1}. {q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded border border-emerald-100">Answer</span>
                        <p className="text-emerald-700 text-xs font-medium truncate flex-1">{q.options[q.correctAnswer]}</p>
                      </div>
                      <div className="mt-1 pt-2 border-t border-gray-100/50">
                        <p className="text-gray-500 text-[11px] leading-relaxed italic flex items-start gap-1.5"><Sparkles className="w-3 h-3 text-amber-500 opacity-70 shrink-0 mt-0.5" />{q.hint}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Session History Modal */}
      {showHistoryModal && (
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
      )}
    </div>
  );
};