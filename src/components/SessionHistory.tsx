import React, { useEffect, useState } from 'react';
import { getSessionHistory, SessionRecord, subscribeToActiveSessions, ActiveSession, endBroadcast } from '../services/classroomSync';
import { Clock, BookOpen, ChevronRight, Calendar, ArrowRight, StopCircle } from 'lucide-react';
import { LessonData } from '../types';

interface SessionHistoryProps {
    onSelectSession: (lesson: LessonData) => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ onSelectSession }) => {
    const [history, setHistory] = useState<SessionRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

    useEffect(() => {
        const unsub = subscribeToActiveSessions((sessions) => {
            setActiveSessions(sessions);
        });
        return unsub;
    }, []);

    useEffect(() => {
        // Load history on mount
        setHistory(getSessionHistory());

        // Listen for storage events (in case history updates from another tab)
        const handler = (e: StorageEvent) => {
            if (e.key === 'vta_session_history') {
                setHistory(getSessionHistory());
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const allHistory = [...history];
    activeSessions.forEach(activeSession => {
        if (!allHistory.some(h => h.lesson.topic === activeSession.lesson.topic)) {
            allHistory.unshift({
                id: activeSession.sessionId,
                lesson: activeSession.lesson,
                timestamp: new Date().toISOString() as any // Mock timestamp
            });
        }
    });

    const filteredHistory = allHistory.filter(record =>
        record.lesson.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.lesson.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (allHistory.length === 0) {
        return (
            <div className="text-center p-8 dashboard-card border-dashed border-2 border-amber-200/50 rounded-3xl">
                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-amber-100">
                    <Clock className="w-7 h-7 text-amber-600/60" />
                </div>
                <h3 className="text-gray-900 font-bold font-playfair text-xl">No Session History</h3>
                <p className="text-sm text-gray-500 mt-2 font-medium">
                    Your past lessons will appear here for revision.
                </p>
            </div>
        );
    }

    return (
        <div className="dashboard-card rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-amber-100/50 bg-amber-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-3 font-playfair text-xl">
                    <div className="w-8 h-8 rounded-full bg-amber-100/80 flex items-center justify-center shadow-inner ring-1 ring-amber-200">
                        <Clock className="w-4 h-4 text-amber-700" />
                    </div>
                    Recent Sessions
                </h3>
                <div className="relative max-w-xs w-full">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search history..."
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 outline-none text-xs transition-all duration-300"
                    />
                    <Clock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2" />
                </div>
                <span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded border border-gray-200">
                    {filteredHistory.length} Results
                </span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {filteredHistory.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 italic text-sm">
                        No matches found for "{searchQuery}"
                    </div>
                ) : (
                    filteredHistory.map((record) => {
                        const activeSession = activeSessions.find(s => s.topic === record.lesson.topic || s.sessionId === record.id);
                        const isActive = !!activeSession;

                        return (
                            <div key={record.id} className="w-full text-left p-5 hover:bg-amber-50/40 hover:-translate-y-1 hover:shadow-sm hover:z-10 transition-all duration-300 group flex items-start gap-5 border-b border-gray-100/50 last:border-0 relative bg-white/40">
                                <button
                                    onClick={() => onSelectSession(record.lesson)}
                                    className="flex-1 flex items-start gap-4 text-left"
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm ${isActive ? 'bg-red-50 text-red-600 ring-1 ring-red-200 group-hover:bg-red-100' : 'bg-[#FDFBF7] text-amber-700 ring-1 ring-amber-200/60 group-hover:bg-amber-100 group-hover:text-amber-800'}`}>
                                        <BookOpen className="w-6 h-6" />
                                    </div>

                                    <div className="flex-1 min-w-0 pr-24 pt-1">
                                        <h4 className={`text-lg font-bold truncate transition-colors ${isActive ? 'text-red-700' : 'text-gray-900 group-hover:text-amber-800'}`}>
                                            {record.lesson.topic}
                                        </h4>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                            {isActive && (
                                                <span className="flex items-center gap-1 font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                    LIVE
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(record.id).toLocaleDateString()}
                                            </span>
                                            <span>•</span>
                                            <span>{record.lesson.level}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                            {record.lesson.summary}
                                        </p>
                                    </div>
                                </button>

                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {isActive && activeSession ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("End this active session for all students?")) {
                                                    endBroadcast(activeSession.sessionId);
                                                }
                                            }}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded text-xs font-bold flex items-center gap-1 transition-colors border border-red-100 hover:border-red-600"
                                            title="End this live session"
                                        >
                                            <StopCircle className="w-3.5 h-3.5" /> End
                                        </button>
                                    ) : (
                                        <button onClick={() => onSelectSession(record.lesson)} className="p-2">
                                            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
