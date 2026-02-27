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
import { auth } from './services/firebase';

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-4xl w-full rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Branding */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center bg-indigo-600 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">EduGenie VTA</h1>
            <p className="text-indigo-100 text-lg leading-relaxed mb-8">
              The AI-powered Virtual Teaching Assistant. Empowering teachers with instant content and students with adaptive guidance.
            </p>
            <div className="flex gap-4 text-sm font-medium text-indigo-200">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span> Online</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Gemini AI Active</span>
            </div>
          </div>
        </div>

        {/* Right Side: Selection */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Select Your Role</h2>

          <div className="space-y-6">
            <button
              onClick={handleTeacherModeClick}
              className="w-full p-6 rounded-xl border-2 border-gray-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all group text-left relative overflow-hidden hover:-translate-y-1 hover:shadow-lg animate-slide-up"
            >
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition-colors">
                  <Users className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-indigo-700">Teacher Mode</h3>
                  <p className="text-sm text-gray-500 mt-1">Design lessons, generate diagrams, and broadcast content.</p>
                </div>
              </div>
              <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all text-indigo-600" />
            </button>

            <button
              onClick={() => navigate('/login?mode=student')}
              className="w-full p-6 rounded-xl border-2 border-gray-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all group text-left relative overflow-hidden hover:-translate-y-1 hover:shadow-lg animate-slide-up animation-delay-100"
            >
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition-colors">
                  <GraduationCap className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-indigo-700">Student Mode</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Join the active classroom session or wait for broadcast.
                  </p>
                </div>
              </div>
              <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all text-indigo-600" />
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Start as a Teacher to create a lesson, then switch to Student view to experience the VTA.
            </p>
            <button
              onClick={() => {
                import('./utils/MockData').then(m => {
                  // Direct navigation to student with state is tricky with HashRouter if we want "Demo" mode
                  // So we'll navigate to /student and pass state or just use global sync
                  // For demo, we can just broadcast the lesson!
                  const sessionId = startBroadcast(m.DEMO_LESSON, 'Demo Teacher');
                  navigate(`/student?sessionId=${sessionId}`);
                });
              }}
              className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline uppercase tracking-wide"
            >
              Or Try a Quick Demo Lesson
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

      <div className="flex-1 max-w-4xl mx-auto w-full p-6 pt-12 flex flex-col items-center">

        {/* Active Sessions List */}
        <div className="w-full max-w-2xl mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Live Classrooms</h2>
          </div>

          {activeSessions.length === 0 ? (
            <div className="bg-white border text-center border-gray-200 rounded-xl p-8 shadow-sm">
              <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No live classes right now.</p>
              <p className="text-sm text-gray-400 mt-1">Wait for your teacher to start a broadcast.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeSessions.map((session) => (
                <div key={session.sessionId} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold">{session.lesson.level}</span>
                      <span className="text-sm font-semibold text-gray-500">{session.teacherName}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{session.topic}</h3>
                  </div>
                  <button
                    onClick={() => navigate(`/student?sessionId=${session.sessionId}`)}
                    className="flex justify-center items-center h-10 px-6 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Join Lesson
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="w-full max-w-2xl">
          <SessionHistory onSelectSession={setHistoryLesson} />
        </div>

        {/* Self-Study Dashboard Section */}
        <div className="w-full max-w-2xl mt-8">
          <StudentSelfStudy />
        </div>

        {/* Doubts Management Section */}
        <div className="w-full max-w-2xl mt-8">
          <MyDoubtsNotepad
            onSendDoubt={() => { }}
            disabled={true}
          />
          <p className="text-xs text-gray-500 text-center mt-3">
            * You can only send doubts to the teacher when you are in an active live session. Saved drafts will be available when you join one.
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