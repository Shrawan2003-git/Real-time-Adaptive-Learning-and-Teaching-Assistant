import React, { useState, useEffect } from 'react';
import { LessonData } from '../types';
import { BookOpen, StopCircle, ArrowLeft, Share2, Video, ImageIcon, Sparkles, MessageSquare, AlertCircle, Send, Plus, Users, User, Link as LinkIcon, Trash2 } from 'lucide-react';
import { subscribeToSession, endBroadcast, subscribeToDoubts, replyToDoubt, subscribeToStudentActivity, StudentActivity, shareMaterial, deleteSharedMaterial, subscribeToMaterials, SharedMaterial } from '../services/classroomSync';
import { Button } from './Button';
import { renderMarkdown } from '../utils/markdownUtils';

export const TeacherLiveView: React.FC<{ sessionId: string, onExit: () => void }> = ({ sessionId, onExit }) => {
    const [lesson, setLesson] = useState<LessonData | null>(null);
    const [doubts, setDoubts] = useState<any[]>([]);
    const [answeringDoubtId, setAnsweringDoubtId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [activities, setActivities] = useState<StudentActivity[]>([]);

    // Custom Materials State
    const [materials, setMaterials] = useState<SharedMaterial[]>([]);
    const [newMaterialTitle, setNewMaterialTitle] = useState('');
    const [newMaterialUrl, setNewMaterialUrl] = useState('');
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);

    useEffect(() => {
        // Subscribe to active lesson
        const unsubLesson = subscribeToSession(sessionId, (data) => {
            setLesson(data?.lesson || null);
        });

        // Subscribe to student doubts
        const unsubDoubts = subscribeToDoubts(sessionId, (doubtsList) => {
            setDoubts(doubtsList);
        });

        // Subscribe to student activity tracking
        const unsubActivity = subscribeToStudentActivity(sessionId, (actData) => {
            setActivities(actData);
        });

        // Subscribe to shared materials
        const unsubMaterials = subscribeToMaterials(sessionId, (mats) => {
            setMaterials(mats);
        });

        return () => {
            unsubLesson();
            unsubDoubts();
            unsubActivity();
            unsubMaterials();
        };
    }, []);

    const handleEndSession = async () => {
        await endBroadcast(sessionId);
        onExit();
    };

    const handleReply = (doubtId: string) => {
        if (!replyText.trim()) return;
        replyToDoubt(sessionId, doubtId, replyText);
        setAnsweringDoubtId(null);
        setReplyText('');
    };

    const handleShareMaterial = async () => {
        if (!newMaterialTitle.trim() || !newMaterialUrl.trim()) return;
        setIsAddingMaterial(true);
        try {
            await shareMaterial(sessionId, {
                title: newMaterialTitle,
                url: newMaterialUrl,
                type: 'link'
            });
            setNewMaterialTitle('');
            setNewMaterialUrl('');
        } catch (e) {
            console.error("Failed to share material", e);
            alert("Failed to share material. Check console.");
        } finally {
            setIsAddingMaterial(false);
        }
    };

    if (!lesson) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
                    <StopCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">No Active Session</h2>
                    <p className="text-gray-500 mb-6">There is currently no broadcast active.</p>
                    <Button onClick={onExit} icon={<ArrowLeft className="w-4 h-4" />}>
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Live Header */}
            <header className="bg-white shadow-sm sticky top-0 z-30 border-b-2 border-red-500">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onExit} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                            Live Broadcast Control Center
                        </h1>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleEndSession}
                            className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300 transition-colors"
                        >
                            End Session for All
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: What students see */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Actively Teaching</h2>
                                <h3 className="text-2xl font-bold text-gray-900">{lesson.topic}</h3>
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">{lesson.level}</span>
                        </div>

                        <div className="mb-6">
                            {renderMarkdown(lesson.summary)}
                        </div>

                        {/* Interactive Elements */}
                        {lesson.videoUrl && (
                            <div className="bg-black rounded-lg overflow-hidden aspect-video relative mb-4">
                                <video src={lesson.videoUrl} controls className="w-full h-full" />
                            </div>
                        )}

                        {lesson.imageUrl && !lesson.videoUrl && (
                            <div className="bg-gray-100 p-3 rounded-lg flex justify-center mb-4 border border-gray-200">
                                <img
                                    src={lesson.imageUrl.startsWith('data:') || lesson.imageUrl.startsWith('http') ? lesson.imageUrl : `data:image/jpeg;base64,${lesson.imageUrl}`}
                                    alt="Visual Aid"
                                    className="max-h-[300px] object-contain rounded drop-shadow-sm"
                                />
                            </div>
                        )}

                        <div className="bg-indigo-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-indigo-900 mb-2 text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Key Discussion Points
                            </h4>
                            <ul className="space-y-2">
                                {lesson.keyPoints.map((point, idx) => (
                                    <li key={idx} className="flex gap-2 text-sm text-indigo-800">
                                        <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center shrink-0 font-bold block text-xs">{idx + 1}</div>
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Student Activity Dashboard */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                                <Users className="w-5 h-5 text-blue-500" />
                                Real-time Engagement
                            </h2>
                            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                                {activities.length} Active
                            </span>
                        </div>

                        {activities.length === 0 ? (
                            <div className="text-center p-6 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                                <p className="text-sm font-medium">Waiting for students to join...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {activities.map(act => {
                                    // Parse lastActive to a relative time
                                    const secondsAgo = Math.floor((new Date().getTime() - new Date(act.lastActive).getTime()) / 1000);
                                    let statusColor = 'bg-gray-100 text-gray-500';
                                    let statusDot = 'bg-gray-400';
                                    let tabLabel = act.currentTab;

                                    if (act.currentTab === 'learn') { statusColor = 'bg-blue-50 text-blue-700 border-blue-100'; statusDot = 'bg-blue-500'; tabLabel = 'Learning Material'; }
                                    else if (act.currentTab === 'quiz') { statusColor = 'bg-purple-50 text-purple-700 border-purple-100'; statusDot = 'bg-purple-500'; tabLabel = 'Practice Quiz'; }
                                    else if (act.currentTab === 'resources') { statusColor = 'bg-teal-50 text-teal-700 border-teal-100'; statusDot = 'bg-teal-500'; tabLabel = 'Resources'; }
                                    else if (act.currentTab === 'exam') { statusColor = 'bg-indigo-50 text-indigo-700 border-indigo-100'; statusDot = 'bg-indigo-500'; tabLabel = 'Exam Simulator'; }
                                    else if (act.currentTab === 'drafts') { statusColor = 'bg-amber-50 text-amber-700 border-amber-100'; statusDot = 'bg-amber-500'; tabLabel = 'Doubts Notepad'; }

                                    const isOffline = secondsAgo > 60; // Just an example logic

                                    // Override styling if the student is distracted based on webcam AttentionTracker
                                    let borderStyle = 'border-transparent';
                                    let attentionBadge = null;

                                    if (!isOffline && act.attentionStatus && act.attentionStatus !== 'focused') {
                                        if (act.attentionStatus === 'away') {
                                            borderStyle = 'border-red-400 ring-1 ring-red-400';
                                            attentionBadge = <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Away</span>;
                                        } else if (act.attentionStatus === 'distracted') {
                                            borderStyle = 'border-amber-400 ring-1 ring-amber-400';
                                            attentionBadge = <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Distracted</span>;
                                        } else if (act.attentionStatus === 'confused') {
                                            borderStyle = 'border-amber-400 shadow-sm';
                                            attentionBadge = <span className="bg-amber-50 text-amber-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Confused</span>;
                                        }
                                    }

                                    return (
                                        <div key={act.studentId} className={`border rounded-xl p-3 flex items-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${isOffline ? 'opacity-50 grayscale' : statusColor} ${borderStyle}`}>
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="font-bold text-sm truncate">{act.studentName}</h4>
                                                    {attentionBadge}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs font-medium mt-0.5 opacity-80">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-gray-400' : statusDot}`}></span>
                                                    <span className="truncate">{isOffline ? 'Offline' : tabLabel}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Shared Materials Control */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                                <LinkIcon className="w-5 h-5 text-indigo-500" />
                                Custom Study Materials
                            </h2>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                            <h3 className="text-sm font-bold text-gray-700 mb-3">Push New Link to Students</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <input
                                    type="text"
                                    placeholder="Resource Title (e.g. Wikipedia: Photosynthesis)"
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newMaterialTitle}
                                    onChange={e => setNewMaterialTitle(e.target.value)}
                                />
                                <input
                                    type="url"
                                    placeholder="URL (https://...)"
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newMaterialUrl}
                                    onChange={e => setNewMaterialUrl(e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={handleShareMaterial}
                                disabled={!newMaterialTitle.trim() || !newMaterialUrl.trim()}
                                isLoading={isAddingMaterial}
                                className="w-full sm:w-auto text-sm h-9"
                                icon={<Plus className="w-4 h-4" />}
                            >
                                Share Instantly
                            </Button>
                        </div>

                        {materials.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Actively Shared</h3>
                                {materials.map(mat => (
                                    <div key={mat.id} className="flex items-center justify-between p-3 border border-indigo-100 bg-indigo-50/30 rounded-lg">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                                <LinkIcon className="w-4 h-4" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-bold text-gray-900 truncate">{mat.title}</p>
                                                <a href={mat.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline truncate block">{mat.url}</a>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteSharedMaterial(sessionId, mat.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 m-2"
                                            title="Remove Material"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Live Doubts Inbox */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 h-full max-h-[calc(100vh-8rem)] flex flex-col">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-indigo-900">
                                <MessageSquare className="w-5 h-5 text-indigo-600" />
                                Live Doubts
                            </h2>
                            {doubts.length > 0 && (
                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{doubts.length}</span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                            {doubts.length === 0 ? (
                                <div className="text-center p-8 flex flex-col items-center justify-center h-full text-gray-400">
                                    <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No doubts raised yet.</p>
                                    <p className="text-xs mt-1">Student questions will appear here instantly.</p>
                                </div>
                            ) : (
                                doubts.slice().reverse().map(d => (
                                    <div key={d.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 shadow-sm transition-all duration-300 hover:-translate-x-1 hover:shadow-md hover:bg-white hover:border-indigo-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] uppercase">
                                                    {d.studentName.substring(0, 2)}
                                                </div>
                                                {d.studentName}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 text-sm mb-3 pl-8 leading-relaxed">{d.question}</p>

                                        {/* Reply section */}
                                        <div className="pl-8">
                                            {d.status === 'replied' ? (
                                                <div className="bg-white border text-sm border-emerald-100 rounded-lg p-3">
                                                    <div className="text-xs font-bold text-emerald-600 mb-1 flex items-center gap-1">
                                                        <Sparkles className="w-3 h-3" /> Teacher Reply
                                                    </div>
                                                    <p className="text-gray-800">{d.reply}</p>
                                                </div>
                                            ) : answeringDoubtId === d.id ? (
                                                <div className="mt-2 text-sm">
                                                    <textarea
                                                        value={replyText}
                                                        onChange={e => setReplyText(e.target.value)}
                                                        placeholder="Type your explanation here..."
                                                        className="w-full text-sm border border-indigo-200 rounded-lg p-2 resize-none focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2 mt-2 justify-end">
                                                        <button
                                                            onClick={() => setAnsweringDoubtId(null)}
                                                            className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-200 rounded-md font-medium"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleReply(d.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 rounded-md font-medium disabled:opacity-50"
                                                            disabled={!replyText.trim()}
                                                        >
                                                            <Send className="w-3 h-3" /> Send
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setAnsweringDoubtId(d.id)}
                                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2.5 py-1.5 rounded-md transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" /> Reply
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
