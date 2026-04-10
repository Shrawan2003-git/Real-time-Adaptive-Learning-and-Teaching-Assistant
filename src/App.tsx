import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { LessonData } from './types';
import { TeacherView } from './components/TeacherView';
import { TeacherLiveView } from './components/TeacherLiveView';
import { StudentView } from './components/StudentView';
import { GraduationCap, Users, ArrowRight, AlertTriangle, PlayCircle, StopCircle, User, LogOut, Home } from 'lucide-react';
import { startBroadcast, subscribeToActiveSessions, ActiveSession, endBroadcast } from './services/classroomSync';
import { SessionHistory } from './components/SessionHistory';
import { MyDoubtsNotepad } from './components/MyDoubtsNotepad';
import { StudentSelfStudy } from './components/StudentSelfStudy';
import { Auth } from './components/Auth';
import { Footer } from './components/Footer';
import { auth } from './services/firebase';
import { Sparkles } from 'lucide-react'; // Added import

// Landing Page Component
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const unsub = subscribeToActiveSessions((sessions) => {
      setActiveSessions(sessions);
    });
    return () => unsub();
  }, []);

  const handleTeacherModeClick = () => {
    // If there ARE active sessions, show a warning.
    // In a real app, you'd check if THIS SPECIFIC TEACHER has one active,
    // but for demo purposes, if any is active, we can show warning or just let them through.
    // Let's assume if there's any active session, we warn them they might disrupt it.
    if (activeSessions.length > 0) {
      setShowWarning(true);
    } else {
      navigate('/login?mode=teacher');
    }
  };

  return (
    <>
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* FULLSCREEN Custom User Animation Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none"
      >
        <source src="/animation bg.mp4" type="video/mp4" />
      </video>

      {/* Fullscreen Overlay to ensure the card stands out */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

      <div className="bg-white/95 backdrop-blur-xl max-w-4xl w-full rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 overflow-hidden flex flex-col md:flex-row relative z-10 animate-fade-in">

        {/* Left Side: Branding */}
        <div className="md:w-1/2 p-10 lg:p-12 flex flex-col justify-center text-white relative overflow-hidden bg-transparent">
          {/* Dark Overlay for Text Readability slightly darkened for absolute bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-black/60 pointer-events-none rounded-l-3xl"></div>

          {/* Dark Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 to-black/80 pointer-events-none"></div>

          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center mb-8 shadow-xl transform transition-transform hover:scale-110 hover:rotate-6 duration-300">
              <GraduationCap className="w-12 h-12 text-white drop-shadow-md" />
            </div>
            <h1 className="text-5xl font-extrabold mb-6 tracking-tight drop-shadow-sm text-white">VTA</h1>
            <p className="text-indigo-100 text-lg leading-relaxed mb-10 font-medium opacity-90">
              The AI-powered Virtual Teaching Assistant. Empowering teachers with instant content and students with adaptive guidance.
            </p>
            <div className="flex gap-4 text-sm font-semibold text-indigo-100 bg-black/30 w-fit px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span> Online</span>
            </div>
          </div>
        </div>

        {/* Right Side: Selection */}
        <div className="md:w-1/2 p-10 lg:p-12 flex flex-col justify-center bg-white">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-sm text-gray-500 mb-8 font-medium">Select your portal to continue</p>

          <div className="space-y-4">
            <button
              onClick={handleTeacherModeClick}
              className="w-full p-5 rounded-xl border-2 border-gray-100 hover:border-indigo-600 hover:bg-indigo-50/50 hover:shadow-lg transition-all duration-300 group text-left relative overflow-hidden hover:-translate-y-0.5 bg-white"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all duration-300 shadow-sm group-hover:shadow-indigo-200">
                  <Users className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors duration-300">Teacher Portal</h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Design lessons, generate diagrams, and broadcast.</p>
                </div>
              </div>
              <ArrowRight className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-indigo-600 w-5 h-5" />
            </button>

            <button
              onClick={() => navigate('/login?mode=student')}
              className="w-full p-5 rounded-xl border-2 border-gray-100 hover:border-blue-600 hover:bg-blue-50/50 hover:shadow-lg transition-all duration-300 group text-left relative overflow-hidden hover:-translate-y-0.5 bg-white"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300 shadow-sm group-hover:shadow-blue-200">
                  <GraduationCap className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">Student Portal</h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Join active classrooms and get adaptive guidance.</p>
                </div>
              </div>
              <ArrowRight className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-blue-600 w-5 h-5" />
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <button
              onClick={() => {
                import('./utils/MockData').then(m => {
                  const sessionId = startBroadcast(m.DEMO_LESSON, 'Demo Teacher');
                  navigate(`/student?sessionId=${sessionId}`);
                });
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider flex items-center justify-center gap-2 mx-auto group"
            >
              <PlayCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Try a Quick Demo Lesson
            </button>
          </div>

        </div>
      </div>



      {/* Active Session Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Active Sessions Running</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              There are currently <strong>{activeSessions.length}</strong> active session(s) running.
              Starting a new session is fine, but be careful not to end existing ones if they belong to other teachers.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {activeSessions.map((session) => (
                <div key={session.sessionId} className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setShowWarning(false);
                      navigate(`/teacher-live/${session.sessionId}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm truncate"
                  >
                    <PlayCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">Resume {session.topic || 'Lesson'}</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to forcibly end this session?")) {
                        await endBroadcast(session.sessionId);
                        if (activeSessions.length <= 1) setShowWarning(false);
                      }
                    }}
                    className="px-4 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-600 hover:text-white transition-colors border border-red-100 flex items-center justify-center shrink-0"
                    title="End Session"
                  >
                    <StopCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => {
                  setShowWarning(false);
                  navigate('/login?mode=teacher');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-colors mt-4"
              >
                Start New Lesson
              </button>

              <button
                onClick={() => setShowWarning(false)}
                className="w-full py-3 px-4 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    <Footer />
    </>
  );
};

const TeacherRoute: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Basic protection
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) navigate('/login?mode=teacher');
    });
    return unsubscribe;
  }, [navigate]);

  return (
    <TeacherView
      onBack={() => navigate('/')}
      onLogout={async () => {
        await auth.signOut();
        navigate('/');
      }}
    />
  );
};

const TeacherLiveRoute: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  useEffect(() => {
    // Basic protection
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) navigate('/login?mode=teacher');
    });
    return unsubscribe;
  }, [navigate]);

  if (!sessionId) return <div>Invalid Session</div>;

  return (
    <TeacherLiveView
      sessionId={sessionId}
      onExit={() => {
        navigate('/teacher');
      }}
    />
  );
};

const StudentRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeSessionId = queryParams.get('sessionId');

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [historyLesson, setHistoryLesson] = useState<LessonData | null>(null);
  const [studentName, setStudentName] = useState<string>("Student");
  const [activeDashboardTab, setActiveDashboardTab] = useState<'live' | 'self-study'>('live');

  useEffect(() => {
    // Basic protection
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login?mode=student');
      } else {
        setStudentName(user.displayName || "Student");
      }
    });
    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    // Subscribe to all active broadcasts
    const unsubscribe = subscribeToActiveSessions((sessions) => {
      setActiveSessions(sessions);
    });
    return () => unsubscribe();
  }, []);

  // 1. Live Lesson Joined
  if (activeSessionId) {
    // We pass the sessionId to StudentView, it handles loading the lesson inside
    return (
      <StudentView
        sessionId={activeSessionId}
        studentName={studentName}
        onExit={() => {
          navigate('/student'); // clear the query param
        }}
        onLogout={async () => {
          await auth.signOut();
          navigate('/');
        }}
        onHome={() => {
          navigate('/student'); // Return to student multi-session dashboard
        }}
      />
    );
  }

  // 2. Reviewing History
  if (historyLesson) {
    return (
      <StudentView
        lesson={historyLesson}
        studentName={studentName}
        isHistoryMode={true}
        onExit={() => setHistoryLesson(null)}
        onLogout={async () => {
          await auth.signOut();
          navigate('/');
        }}
        // onHome is just onExit for history mode (back to student dashboard)
        onHome={() => setHistoryLesson(null)}
      />
    );
  }

  // 3. Mult-Session Dashboard
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                await auth.signOut();
                navigate('/');
              }}
              className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors text-sm font-medium border border-red-100"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
              title="Back to Home"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Home</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 pt-8 md:pt-12 flex flex-col lg:flex-row gap-8 items-start justify-center">

        {/* Left Column - Main Content */}
        <div className="flex-1 flex flex-col items-center w-full max-w-2xl">
          {/* Dashboard Tabs */}
          <div className="w-full flex gap-6 mb-8 border-b border-gray-200">
            <button
              onClick={() => setActiveDashboardTab('live')}
              className={`pb-3 px-2 font-bold text-sm transition-all border-b-2 ${activeDashboardTab === 'live' ? 'border-[#00E5FF] text-blue-600 shadow-[0_2px_10px_rgba(0,229,255,0.2)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Live Classrooms & History
            </button>
            <button
              onClick={() => setActiveDashboardTab('self-study')}
              className={`pb-3 px-2 font-bold text-sm transition-all border-b-2 ${activeDashboardTab === 'self-study' ? 'border-[#00E5FF] text-blue-600 shadow-[0_2px_10px_rgba(0,229,255,0.2)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              AI Self-Study Dashboard
            </button>
          </div>

          {activeDashboardTab === 'live' && (
            <>
              {/* Active Sessions List */}
              <div className="w-full mb-12 animate-fadeIn">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center ring-1 ring-green-500/30">
                    <span className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]"></span>
                  </div>
                  <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-400 font-inter tracking-tight">Live Classrooms</h2>
                </div>

                {activeSessions.length === 0 ? (
                  <div className="dashboard-card border-dashed border-2 border-emerald-500/20 text-center rounded-3xl p-10 shadow-lg relative overflow-hidden flex flex-col items-center justify-center">
                    {/* Subtle 2D abstract traditional/futuristic element illustration */}
                    <div className="w-32 h-32 relative mb-6 opacity-60 mix-blend-multiply">
                      <div className="absolute inset-0 border-4 border-amber-200/50 rounded-lg transform rotate-6 transition-transform hover:rotate-12 duration-500"></div>
                      <div className="absolute inset-0 border-4 border-emerald-400/40 rounded-full transform -rotate-3 transition-transform hover:-rotate-12 duration-500"></div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-amber-100/30 to-blue-200/30 backdrop-blur-sm rounded-xl"></div>
                      <Sparkles className="w-10 h-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600/50" />
                    </div>
                    <p className="text-gray-500 font-bold text-lg font-inter">No live classes right now.</p>
                    <p className="text-sm text-gray-400 mt-2 font-medium">Wait for your teacher to start a broadcast.</p>
                  </div>
                ) : (
                  <div className="grid gap-5">
                    {activeSessions.map((session) => (
                      <div key={session.sessionId} className="dashboard-card rounded-2xl p-6 flex items-center justify-between group">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold">{session.lesson.level}</span>
                            <span className="text-sm font-semibold text-gray-500">{session.teacherName}</span>
                          </div>
                          <h3 className="text-xl font-extrabold text-gray-900 group-hover:text-emerald-700 transition-colors">{session.topic}</h3>
                        </div>
                        <button
                          onClick={() => navigate(`/student?sessionId=${session.sessionId}`)}
                          className="flex justify-center items-center h-12 px-8 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all text-sm tracking-wide"
                        >
                          Join Lesson
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History Section */}
              <div className="w-full animate-fadeIn">
                <SessionHistory onSelectSession={setHistoryLesson} />
              </div>
            </>
          )}

          {/* Self-Study Dashboard Section */}
          {activeDashboardTab === 'self-study' && (
            <div className="w-full animate-fadeIn">
              <StudentSelfStudy />
            </div>
          )}
        </div>

        {/* Right Column - Doubts Notepad */}
        <div className="w-full lg:w-[320px] shrink-0 sticky top-24 pt-2">
          <MyDoubtsNotepad
            onSendDoubt={() => { }}
            disabled={true}
          />
          <p className="text-xs text-slate-500 text-center mt-4 bg-white/70 backdrop-blur-md p-4 border border-slate-200/80 rounded-2xl leading-relaxed shadow-sm font-medium">
            💡 <span className="text-blue-600 font-bold mb-1 block">Draft Mode</span>
            Jot your doubts here anytime! They will be securely saved and ready to send instantly when you jump into a live session.
          </p>
        </div>

      </div>
    </div>
  );
};


const App: React.FC = () => {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/teacher" element={<TeacherRoute />} />
        <Route path="/teacher-live/:sessionId" element={<TeacherLiveRoute />} />
        <Route path="/student" element={<StudentRoute />} />
      </Routes>
    </Router>
  );
};

export default App;