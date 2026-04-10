import React, { useState, useRef } from 'react';
import { LessonData } from '../types';
import { ChatInterface } from './ChatInterface';
import { AttentionTracker } from './AttentionTracker';
import { generateLessonAudio } from '../services/geminiService';
import { base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';
import { BookOpen, HelpCircle, CheckCircle, XCircle, AlertCircle, Eye, Volume2, Play, Loader2, Pause, ArrowLeft, MessageCircle, Clock, Search, ExternalLink, Video as VideoIcon, FileText, Hash, Home, LogOut } from 'lucide-react';
import { Button } from './Button';
import { raiseDoubt, Doubt, subscribeToDoubts, subscribeToSession, ActiveSession, subscribeToMaterials, SharedMaterial } from '../services/classroomSync';
import { searchRelatedResources } from '../services/geminiService';
import { RelatedResource } from '../types';
import { SessionHistory } from './SessionHistory';
import { MyDoubtsNotepad } from './MyDoubtsNotepad';
import { ExamSimulator } from './ExamSimulator';
import { renderMarkdown } from '../utils/markdownUtils';

interface StudentViewProps {
  lesson?: LessonData;
  sessionId?: string;
  studentName?: string;
  onExit: () => void;
  onLogout?: () => void;
  onHome?: () => void;
  isHistoryMode?: boolean;
}

export const StudentView: React.FC<StudentViewProps> = ({ lesson, sessionId, studentName = "Student", onExit, onLogout, onHome, isHistoryMode = false }) => {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const currentLesson = lesson || activeSession?.lesson;

  const [activeTab, setActiveTab] = useState<'learn' | 'quiz' | 'resources' | 'drafts' | 'exam'>('learn');
  const [quizAnswers, setQuizAnswers] = useState<number[]>(currentLesson ? new Array(currentLesson.quiz.length).fill(-1) : []);
  const [showResults, setShowResults] = useState(false);
  const [hintVisible, setHintVisible] = useState<boolean[]>(currentLesson ? new Array(currentLesson.quiz.length).fill(false) : []);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Resources State
  const [resources, setResources] = useState<RelatedResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');
  const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);
  const [teacherMaterials, setTeacherMaterials] = useState<SharedMaterial[]>([]);

  // Doubt State
  const [showDoubtModal, setShowDoubtModal] = useState(false);
  const [doubtText, setDoubtText] = useState('');

  const submitDoubt = (text: string) => {
    if (!text.trim() || (!sessionId && !isHistoryMode)) return;
    const doubt: Omit<Doubt, 'status'> = {
      id: Date.now().toString(),
      sessionId: sessionId || "legacy",
      studentName: studentName,
      question: text,
      timestamp: new Date()
    };
    raiseDoubt(doubt);
    alert("Doubt sent to teacher!");
  };

  const handleRaiseDoubt = () => {
    if (!doubtText.trim()) return;
    submitDoubt(doubtText);
    setDoubtText('');
    setShowDoubtModal(false);
  };

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attention State
  const [attentionStatus, setAttentionStatus] = useState<'focused' | 'distracted' | 'confused' | 'away'>('focused');
  const [showAttentionAlert, setShowAttentionAlert] = useState(false);
  const [myDoubts, setMyDoubts] = React.useState<Doubt[]>([]);

  // Progress State
  const [hasViewedResources, setHasViewedResources] = useState(false);
  const [hasCompletedQuiz, setHasCompletedQuiz] = useState(false);

  React.useEffect(() => {
    let unsubSession: () => void;
    let unsubDoubts: () => void;
    let unsubMaterials: () => void;

    if (sessionId) {
      unsubSession = subscribeToSession(sessionId, (session) => {
        if (!session) {
          // Session ended by teacher
          alert("The teacher has ended this session.");
          onExit();
        } else {
          setActiveSession(session);
        }
      });

      unsubDoubts = subscribeToDoubts(sessionId, (doubts) => {
        setMyDoubts(doubts);
      });

      unsubMaterials = subscribeToMaterials(sessionId, (mats) => {
        setTeacherMaterials(mats);
      });
    }

    return () => {
      if (unsubSession) unsubSession();
      if (unsubDoubts) unsubDoubts();
      if (unsubMaterials) unsubMaterials();
    };
  }, [sessionId, onExit]);

  // Track tab views for progress and active teacher broadcast
  React.useEffect(() => {
    if (activeTab === 'resources') setHasViewedResources(true);

    // Broadcast active tab to teacher
    if (sessionId && !isHistoryMode) {
      // Use a generated ID or prompt for name in a real app. Here we use a random ID.
      const studentId = localStorage.getItem('vta_student_id') || `student_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('vta_student_id', studentId);
      import('../services/classroomSync').then(m => {
        m.updateStudentActivity(sessionId, studentId, studentName, activeTab, attentionStatus);
      });
    }

  }, [activeTab, attentionStatus, sessionId, isHistoryMode, studentName]);

  // Clean up activity on unmount
  React.useEffect(() => {
    if (!sessionId || isHistoryMode) return;
    const studentId = localStorage.getItem('vta_student_id') || `student_${Math.random().toString(36).substr(2, 9)}`;

    return () => {
      import('../services/classroomSync').then(m => {
        m.removeStudentActivity(sessionId, studentId);
      }).catch(err => console.error("Failed to disconnect activity:", err));
    };
  }, [sessionId, isHistoryMode]);

  // Calculate progress (Learn viewed by default, Resources viewed, Quiz completed)
  const progressPercent = Math.round(((1 + (hasViewedResources ? 1 : 0) + (hasCompletedQuiz ? 1 : 0)) / 3) * 100);

  const handleAnswerSelect = (questionIdx: number, optionIdx: number) => {
    if (showResults) return;
    const newAnswers = [...quizAnswers];
    newAnswers[questionIdx] = optionIdx;
    setQuizAnswers(newAnswers);
  };

  const calculateScore = () => {
    let score = 0;
    if (!currentLesson) return 0;
    quizAnswers.forEach((ans, idx) => {
      if (ans === currentLesson.quiz[idx].correctAnswer) score++;
    });
    return score;
  };

  const toggleHint = (idx: number) => {
    const newHints = [...hintVisible];
    newHints[idx] = !newHints[idx];
    setHintVisible(newHints);
  };

  const handlePlayAudio = async () => {
    if (isPlayingAudio) {
      if (audioSourceRef.current) audioSourceRef.current.stop();
      setIsPlayingAudio(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const base64 = await generateLessonAudio(currentLesson?.summary);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const audioBuffer = await decodeAudioData(base64ToUint8Array(base64), ctx);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlayingAudio(false);

      source.start();
      audioSourceRef.current = source;
      setIsPlayingAudio(true);
    } catch (err) {
      console.error("Audio playback failed", err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const fetchResources = async (query?: string) => {
    setIsLoadingResources(true);
    try {
      const results = await searchRelatedResources(currentLesson?.topic, currentLesson?.level, query);
      setResources(results);
    } catch (err) {
      console.error("Failed to fetch resources", err);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handleResourceSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources(resourceSearchQuery);
  };

  React.useEffect(() => {
    if (activeTab === 'resources' && resources.length === 0) {
      fetchResources();
    }
  }, [activeTab]);

  const handleAttentionUpdate = (status: 'focused' | 'distracted' | 'confused' | 'away') => {
    setAttentionStatus(status);

    // Alert logic
    if (status === 'confused' || status === 'distracted') {
      setShowAttentionAlert(true);
      setTimeout(() => setShowAttentionAlert(false), 8000);
    }

    // Auto-pause logic
    if (status === 'away') {
      // Pause Audio
      if (isPlayingAudio && audioSourceRef.current) {
        audioSourceRef.current.stop();
        setIsPlayingAudio(false);
        // Note: We can't easily resume AudioBufferSourceNode from where it left off without complex state tracking
        // For this demo, 'stop' acts as a hard pause/reset.
      }

      // Pause Video
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  };

  if (!currentLesson && sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!currentLesson) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative animate-fade-in">
      {/* Floating Attention Alert */}
      {showAttentionAlert && (
        <div className="fixed top-20 right-8 z-50 animate-bounce">
          <div className={`p-4 rounded-xl shadow-xl border flex items-start gap-3 max-w-sm ${attentionStatus === 'confused'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">
                {attentionStatus === 'confused' ? 'Seem a bit stuck?' : 'Lost your focus?'}
              </h4>
              <p className="text-sm mt-1">
                {attentionStatus === 'confused'
                  ? 'The VTA noticed you might be confused. Try asking the chat for a simpler explanation!'
                  : 'Let\'s get back on track! Finish this section to unlock the quiz.'}
              </p>
              <button
                onClick={() => setShowAttentionAlert(false)}
                className="text-xs underline mt-2 font-medium opacity-80 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors text-sm font-medium border border-red-100"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <h1 className="font-bold text-gray-800 truncate max-w-md ml-2">{currentLesson?.topic}</h1>
            {isHistoryMode ? (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> Revision Mode
              </span>
            ) : (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium animate-pulse-soft">Live Session</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistoryOverlay(true)}
              className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
            >
              <Clock className="w-4 h-4" />
              History
            </button>
            {!isHistoryMode && (
              <>
                <button
                  onClick={() => setShowDoubtModal(true)}
                  className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  Ask Teacher
                </button>
                <button
                  onClick={onExit}
                  className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  Leave Session
                </button>
              </>
            )}
            {isHistoryMode && (
              <button
                onClick={onExit}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <XCircle className="w-4 h-4" />
                Close Revision
              </button>
            )}
            {onHome && (
              <button
                onClick={onHome}
                className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium ml-2 shadow-sm"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Home</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Doubt Modal */}
      {showDoubtModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Ask a Doubt</h3>
            <textarea
              value={doubtText}
              onChange={e => setDoubtText(e.target.value)}
              placeholder="Type your question for the teacher..."
              className="w-full h-32 border border-gray-200 rounded-lg p-3 resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowDoubtModal(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRaiseDoubt}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                disabled={!doubtText.trim()}
              >
                Send to Teacher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 gap-6 grid grid-cols-1 lg:grid-cols-3">
        {/* Left Column: Listener & Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'learn'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Learning Material
              </div>
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'quiz'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Practice Quiz
              </div>
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'resources'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" /> Related Resources
              </div>
            </button>
            <button
              onClick={() => setActiveTab('exam')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'exam'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Exam Strategy
              </div>
            </button>
          </div>

          {/* Exam Simulator Tab */}
          {activeTab === 'exam' && currentLesson && (
            <ExamSimulator
              topic={currentLesson.topic}
              level={currentLesson.level}
            />
          )}

          {/* Learning Content */}
          {activeTab === 'learn' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 animate-fadeIn">

              {/* Video Section */}
              {currentLesson?.videoUrl && (
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-2">AI Video Lesson</h2>
                  <div className="rounded-xl overflow-hidden shadow-md bg-black relative">
                    <video ref={videoRef} src={currentLesson?.videoUrl} controls className="w-full aspect-video" />
                    {attentionStatus === 'away' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white backdrop-blur-sm">
                        <div className="text-center">
                          <Pause className="w-12 h-12 mx-auto mb-2 opacity-80" />
                          <p className="font-medium">Paused: Student Away</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="prose max-w-none">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Summary</h2>
                  <button
                    onClick={handlePlayAudio}
                    className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    {isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlayingAudio ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {isPlayingAudio ? 'Stop Audio' : 'Listen'}
                  </button>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  {renderMarkdown(currentLesson?.summary || '')}
                </div>
              </div>

              {currentLesson?.imageUrl && !currentLesson?.videoUrl && (
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <div className="relative">
                    <img
                      src={currentLesson?.imageUrl.startsWith('data:') || currentLesson?.imageUrl.startsWith('http') ? currentLesson?.imageUrl : `data:image/jpeg;base64,${currentLesson?.imageUrl}`}
                      alt="Lesson Diagram"
                      className="w-full h-auto object-contain max-h-[500px] min-h-[200px] bg-gray-50 rounded-t-xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const errDiv = document.createElement('div');
                          errDiv.className = "flex flex-col items-center justify-center p-8 bg-gray-50 text-gray-400 h-64 border border-gray-100 rounded-t-xl";
                          errDiv.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-2 opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                <p>Diagram failed to load.</p>
                                <button onclick="this.closest('.relative').querySelector('img').src = this.closest('.relative').querySelector('img').src.split('?')[0] + '?t=' + new Date().getTime(); this.closest('.relative').querySelector('img').style.display='block'; this.parentNode.remove();" class="mt-3 px-3 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50 transition-colors">
                                    Retry Loading
                                </button>
                            `;
                          parent.appendChild(errDiv);
                        }
                      }}
                    />
                    <div className="absolute top-3 right-3 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm tracking-wide font-medium">
                      AI Generated
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 text-xs text-center text-gray-500 border-t border-gray-100">
                    AI Generated Visual Aid based on Instructor Prompt
                  </div>
                </div>
              )}

              <div className="bg-indigo-50 rounded-xl p-6">
                <h3 className="font-semibold text-indigo-900 mb-3">Key Takeaways</h3>
                <ul className="space-y-2">
                  {currentLesson?.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-indigo-800">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Quiz Content */}
          {activeTab === 'quiz' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Knowledge Check</h2>
                {showResults && (
                  <span className="text-lg font-bold text-blue-600">
                    Score: {calculateScore()} / {currentLesson?.quiz.length}
                  </span>
                )}
              </div>

              <div className="space-y-8">
                {currentLesson?.quiz.map((q, idx) => {
                  const isWrong = showResults && quizAnswers[idx] !== q.correctAnswer;

                  return (
                    <div key={idx} className="space-y-4">
                      <p className="font-medium text-gray-800 text-lg leading-snug">{idx + 1}. {q.question}</p>

                      <div className="grid gap-3">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = quizAnswers[idx] === optIdx;
                          const isAnswerCorrect = optIdx === q.correctAnswer;

                          let buttonStyle = "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 text-gray-700";
                          if (showResults) {
                            if (isAnswerCorrect) {
                              buttonStyle = "bg-green-50 border-green-500 text-green-800 ring-1 ring-green-500";
                            } else if (isSelected && !isAnswerCorrect) {
                              buttonStyle = "bg-red-50 border-red-500 text-red-800 ring-1 ring-red-500";
                            } else {
                              buttonStyle = "bg-gray-50 border-gray-200 text-gray-400 opacity-60";
                            }
                          } else if (isSelected) {
                            buttonStyle = "bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-600 shadow-sm";
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleAnswerSelect(idx, optIdx)}
                              disabled={showResults}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group flex items-start gap-4 ${buttonStyle}`}
                            >
                              <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                                ${isSelected || (showResults && isAnswerCorrect)
                                  ? 'border-current'
                                  : 'border-gray-300 group-hover:border-blue-400'
                                }`}
                              >
                                {(isSelected || (showResults && isAnswerCorrect)) && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-current" />
                                )}
                              </div>

                              <div className="flex-1">
                                <span className="text-base font-medium leading-relaxed">{opt || `Option ${optIdx + 1}`}</span>
                              </div>

                              {showResults && isAnswerCorrect && <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />}
                              {showResults && isSelected && !isAnswerCorrect && <XCircle className="w-6 h-6 text-red-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Adaptive Hint Section */}
                      {isWrong && (
                        <div className="mt-2 animate-fadeIn">
                          <button
                            onClick={() => toggleHint(idx)}
                            className="text-sm text-amber-600 font-medium flex items-center gap-2 hover:text-amber-700 transition-colors"
                          >
                            <AlertCircle className="w-4 h-4" />
                            {hintVisible[idx] ? 'Hide Hint' : 'Struggling? Show Hint'}
                          </button>
                          {hintVisible[idx] && (
                            <div className="mt-2 p-4 bg-amber-50 text-amber-900 rounded-lg text-sm border border-amber-100 shadow-sm">
                              <span className="font-bold block mb-1">VTA Guidance:</span>
                              {q.hint}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!showResults ? (
                <Button
                  onClick={() => setShowResults(true)}
                  disabled={quizAnswers.some(a => a === -1)}
                  className="w-full h-12 text-lg"
                >
                  Submit Answers
                </Button>
              ) : (
                <Button variant="outline" onClick={() => {
                  setQuizAnswers(new Array(currentLesson?.quiz.length).fill(-1));
                  setShowResults(false);
                  setHintVisible(new Array(currentLesson?.quiz.length).fill(false));
                }} className="w-full h-12 text-lg">
                  Retry Quiz
                </Button>
              )}
            </div>
          )}

          {/* Resources Content */}
          {activeTab === 'resources' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-800">Learning Resources</h2>
                <form onSubmit={handleResourceSearch} className="relative max-w-sm w-full">
                  <input
                    type="text"
                    value={resourceSearchQuery}
                    onChange={(e) => setResourceSearchQuery(e.target.value)}
                    placeholder="Search specific topics..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                </form>
              </div>

              {teacherMaterials.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-8">
                  <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded bg-indigo-200 text-indigo-700 flex items-center justify-center">
                      <ExternalLink className="w-4 h-4" />
                    </span>
                    Teacher's Custom Materials
                  </h3>
                  <div className="grid gap-3">
                    {teacherMaterials.map(mat => (
                      <a
                        key={mat.id}
                        href={mat.url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm hover:shadow hover:border-indigo-300 transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="font-bold text-gray-900 group-hover:text-indigo-700 truncate">{mat.title}</p>
                          <p className="text-xs text-indigo-500 truncate mt-0.5">{mat.url}</p>
                        </div>
                        <Button variant="secondary" className="scale-90 opacity-0 group-hover:opacity-100 transition-opacity">Open</Button>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {isLoadingResources ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p>Curation AI is finding the best materials...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {resources.map((res, idx) => (
                    <a
                      key={idx}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all flex items-start gap-4"
                    >
                      <div className={`p-3 rounded-lg shrink-0 ${res.type === 'video' ? 'bg-red-50 text-red-600' :
                        res.type === 'article' ? 'bg-indigo-50 text-indigo-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                        {res.type === 'video' ? <VideoIcon className="w-5 h-5" /> :
                          res.type === 'article' ? <FileText className="w-5 h-5" /> :
                            <Hash className="w-5 h-5" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 group-hover:text-blue-700 truncate">{res.title}</h4>
                          <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{res.description}</p>
                        <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          {res.type}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar / Chat (1 col) */}
        <div className="space-y-6">
          <MyDoubtsNotepad
            onSendDoubt={submitDoubt}
            disabled={isHistoryMode || (sessionId && !activeSession)}
          />
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Adaptive Assistant</h3>
              <p className="text-blue-100 text-sm mb-4">
                I'm monitoring your progress. Use the chat below if you get stuck.
              </p>

              {/* Attention Status Badge */}
              <div className={`inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 transition-colors ${attentionStatus === 'away' ? 'bg-red-500/20 border-red-200/30' : ''
                }`}>
                {isHistoryMode ? (
                  <>
                    <Clock className="w-3 h-3 text-white/70" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Archived
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className={`w-3 h-3 ${attentionStatus === 'focused' ? 'text-green-300' : 'text-amber-300'}`} />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Status: {attentionStatus}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          </div>

          <AttentionTracker
            isActive={!isHistoryMode}
            onStatusChange={handleAttentionUpdate}
          />

          <ChatInterface lesson={currentLesson!} />

          {/* Teacher Replies Widget */}
          {myDoubts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden animate-fadeIn space-y-0 mt-6">
              <div className="bg-amber-50 p-3 border-b border-amber-100 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-amber-900 text-sm">Teacher Q&A</h3>
              </div>
              <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                {myDoubts.map(d => (
                  <div key={d.id} className="text-sm border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <p className="font-medium text-gray-800">Q: {d.question}</p>
                    {d.status === 'resolved' ? (
                      <div className="mt-2 bg-green-50 text-green-800 p-2 rounded-lg border border-green-100">
                        <span className="font-bold text-[10px] uppercase tracking-wider block mb-1 text-green-600">Teacher Reply</span>
                        {d.reply}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-amber-600 italic flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> Waiting...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chat & Attention */}

      </main>

      {/* Session History Overlay */}
      {showHistoryOverlay && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-800">Your Learning History</h3>
              <button
                onClick={() => setShowHistoryOverlay(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <SessionHistory
                onSelectSession={(historyLesson) => {
                  alert("To switch to this lesson, please exit the current session first.");
                  setShowHistoryOverlay(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
