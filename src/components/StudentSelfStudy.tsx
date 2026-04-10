import React, { useState } from 'react';
import { BookOpen, FileText, Youtube, Search, Loader2, Award, ExternalLink, Download } from 'lucide-react';
import { generatePracticeExam } from '../services/geminiService';
import { RelatedResource } from '../types';
import html2pdf from 'html2pdf.js';

// Assuming searchRelatedResources might need to be exported or added. If not we fall back.
// We'll import it dynamically or assume it exists in geminiService
import { searchRelatedResources } from '../services/geminiService';

export const StudentSelfStudy: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('High School');
    const [isGeneratingExam, setIsGeneratingExam] = useState(false);
    const [isGeneratingResources, setIsGeneratingResources] = useState(false);
    const [examText, setExamText] = useState<string | null>(null);
    const [resources, setResources] = useState<RelatedResource[] | null>(null);
    const [error, setError] = useState('');

    // Switch between Exam and Resources view
    const [activeTab, setActiveTab] = useState<'exam' | 'resources'>('exam');

    const handleGenerateExam = async () => {
        if (!topic.trim()) return;
        setIsGeneratingExam(true);
        setError('');
        setExamText(null);
        setActiveTab('exam');
        try {
            const result = await generatePracticeExam(topic, level, 'both', 50);
            setExamText(result);
        } catch (err: any) {
            setError(err.message || 'Failed to generate practice exam.');
        } finally {
            setIsGeneratingExam(false);
        }
    };

    const handleGenerateResources = async () => {
        if (!topic.trim()) return;
        setIsGeneratingResources(true);
        setError('');
        setResources(null);
        setActiveTab('resources');
        try {
            const results = await searchRelatedResources(topic, level);
            setResources(results);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch resources.');
        } finally {
            setIsGeneratingResources(false);
        }
    };

    const handleDownloadPDF = () => {
        const element = document.getElementById('self-study-exam-content');
        if (!element) return;
        const opt = {
            margin: 1,
            filename: `${topic}-self-study-exam.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
        };
        html2pdf().set(opt).from(element).save();
    };

    return (
        <div className="dashboard-card p-8 relative overflow-hidden border border-[#00E5FF]/20 group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/10 via-transparent to-[#00E5FF]/5 pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-6 border-b border-gray-100/50 pb-5 relative">
                <div className="w-10 h-10 rounded-full bg-blue-100/60 flex items-center justify-center shadow-inner ring-1 ring-[#00E5FF]/30">
                    <BookOpen className="w-5 h-5 text-[#00E5FF]" />
                </div>
                <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-[#00E5FF] font-inter">Self-Study Dashboard</h2>
                <span className="ml-auto text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm border border-blue-100">
                    Independent AI Learning
                </span>
            </div>

            <p className="text-gray-500 text-sm mb-6">
                Tell VTA what you want to learn today, and it will automatically generate a custom practice exam or find the best videos to help you understand it!
            </p>

            {/* Input Form */}
            <div className="space-y-5 mb-8 bg-white/40 p-6 rounded-2xl border border-blue-50 relative">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">What do you want to learn?</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Mitochondria, Algebra, World War II"
                            className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-4 focus:ring-[#00E5FF]/30 focus:border-[#00E5FF] outline-none transition-all duration-300 shadow-sm text-gray-900 font-medium"
                        />
                        <Search className="w-5 h-5 text-blue-400 absolute left-3 top-3.5" />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Level</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-4 focus:ring-[#00E5FF]/30 focus:border-[#00E5FF] outline-none transition-all duration-300 shadow-sm text-gray-900 font-medium font-sans cursor-pointer"
                        >
                            <option>Middle School</option>
                            <option>High School</option>
                            <option>Undergraduate</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 relative">
                    <button
                        onClick={handleGenerateExam}
                        disabled={!topic.trim() || isGeneratingExam || isGeneratingResources}
                        className="flex-1 flex justify-center items-center gap-2 bg-gradient-to-r from-blue-600 to-[#00E5FF] text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-[#00E5FF]/40 active:scale-[0.98] hover:-translate-y-0.5 disabled:opacity-50 tracking-wide text-sm"
                    >
                        {isGeneratingExam ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                        Generate Practice Exam
                    </button>
                    <button
                        onClick={handleGenerateResources}
                        disabled={!topic.trim() || isGeneratingResources || isGeneratingExam}
                        className="flex-1 flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-slate-500/30 active:scale-[0.98] hover:-translate-y-0.5 disabled:opacity-50 tracking-wide text-sm border border-slate-700"
                    >
                        {isGeneratingResources ? <Loader2 className="w-5 h-5 animate-spin" /> : <Youtube className="w-5 h-5 text-red-500" />}
                        Find Study Materials
                    </button>
                </div>

                {error && (
                    <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                        {error}
                    </div>
                )}
            </div>

            {/* Content Display Area */}
            {(examText || resources || isGeneratingExam || isGeneratingResources) && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                    {/* Tabs */}
                    <div className="flex gap-6 mb-4 border-b border-gray-100/50 pb-1">
                        <button
                            className={`pb-3 px-2 font-bold text-sm transition-all border-b-2 ${activeTab === 'exam' ? 'border-[#00E5FF] text-blue-600 shadow-[0_2px_10px_rgba(0,229,255,0.2)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
                            onClick={() => setActiveTab('exam')}
                        >
                            Practice Exam
                        </button>
                        <button
                            className={`pb-3 px-2 font-bold text-sm transition-all border-b-2 ${activeTab === 'resources' ? 'border-[#00E5FF] text-blue-600 shadow-[0_2px_10px_rgba(0,229,255,0.2)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}
                            onClick={() => setActiveTab('resources')}
                        >
                            Study Materials
                        </button>
                    </div>

                    {/* Loading State */}
                    {(isGeneratingExam || isGeneratingResources) && (
                        <div className="text-center py-16 text-blue-500/80">
                            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 relative">
                                <span className="absolute inset-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></span>
                                <Loader2 className="w-8 h-8 text-[#00E5FF] animate-pulse" />
                            </div>
                            <p className="font-medium text-gray-600 tracking-wide text-sm">VTA is thinking and crafting the perfect <span className="text-blue-600 font-bold">{isGeneratingExam ? 'exam' : 'study list'}</span>...</p>
                        </div>
                    )}

                    {/* Exam View */}
                    {activeTab === 'exam' && examText && !isGeneratingExam && (
                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-[#00E5FF]/20 relative animate-slide-up shadow-sm">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50/80 p-3 lg:px-4 rounded-xl border border-emerald-100/50 shadow-sm w-full sm:w-auto">
                                    <Award className="w-5 h-5 text-emerald-500 shrink-0" />
                                    <span className="font-bold text-sm tracking-wide">Exam generated! Ready to test yourself?</span>
                                </div>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all font-bold active:scale-[0.98] w-full sm:w-auto justify-center"
                                    title="Download as PDF"
                                >
                                    <Download className="w-4 h-4" /> Save PDF
                                </button>
                            </div>
                            {/* Simple Markdown Rendering via whitespace-pre-wrap */}
                            <div id="self-study-exam-content" className="prose prose-sm prose-blue max-w-none text-gray-800 whitespace-pre-wrap font-serif leading-relaxed bg-white/80 p-6 md:p-8 border border-blue-50 rounded-2xl shadow-sm">
                                {examText}
                            </div>
                        </div>
                    )}

                    {/* Resources View */}
                    {activeTab === 'resources' && resources && !isGeneratingResources && (
                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-[#00E5FF]/10 animate-slide-up shadow-sm">
                            <h3 className="text-xl font-extrabold text-gray-800 mb-6 font-inter flex items-center gap-3">
                                <Search className="w-5 h-5 text-blue-500" />
                                Curated Network Nodes
                            </h3>
                            <div className="grid gap-4">
                                {resources.map((res, i) => (
                                    <a
                                        key={i}
                                        href={res.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block p-5 rounded-2xl border border-blue-50 hover:border-[#00E5FF]/40 bg-white/80 hover:bg-blue-50/30 hover:-translate-y-1 hover:shadow-md hover:shadow-[#00E5FF]/10 transition-all group duration-300"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${res.type === 'video' ? 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white' : 'bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'} transition-colors`}>
                                                {res.type === 'video' ? <Youtube className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-900 group-hover:text-blue-700 flex items-center gap-2 text-lg">
                                                    {res.title}
                                                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{res.description}</p>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
