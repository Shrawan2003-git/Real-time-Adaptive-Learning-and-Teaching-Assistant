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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xl font-bold text-gray-800">Self-Study Dashboard</h2>
                <span className="ml-auto text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium">
                    Independent Learning
                </span>
            </div>

            <p className="text-gray-500 text-sm mb-6">
                Tell EduGenie what you want to learn today, and it will automatically generate a custom practice exam or find the best videos to help you understand it!
            </p>

            {/* Input Form */}
            <div className="space-y-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">What do you want to learn?</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Mitochondria, Algebra, World War II"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Level</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 outline-none transition-all duration-300"
                        >
                            <option>Middle School</option>
                            <option>High School</option>
                            <option>Undergraduate</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={handleGenerateExam}
                        disabled={!topic.trim() || isGeneratingExam || isGeneratingResources}
                        className="flex-1 flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-all shadow-sm active:scale-[0.98] hover:-translate-y-0.5 disabled:opacity-50"
                    >
                        {isGeneratingExam ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Generate Practice Exam
                    </button>
                    <button
                        onClick={handleGenerateResources}
                        disabled={!topic.trim() || isGeneratingResources || isGeneratingExam}
                        className="flex-1 flex justify-center items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg font-medium transition-all shadow-sm active:scale-[0.98] hover:-translate-y-0.5 disabled:opacity-50"
                    >
                        {isGeneratingResources ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
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
                    <div className="flex gap-4 mb-4 border-b border-gray-200">
                        <button
                            className={`pb-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'exam' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('exam')}
                        >
                            Practice Exam
                        </button>
                        <button
                            className={`pb-2 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'resources' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('resources')}
                        >
                            Study Materials
                        </button>
                    </div>

                    {/* Loading State */}
                    {(isGeneratingExam || isGeneratingResources) && (
                        <div className="text-center py-12 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
                            <p>EduGenie is thinking and crafting the perfect {isGeneratingExam ? 'exam' : 'study list'} for you...</p>
                        </div>
                    )}

                    {/* Exam View */}
                    {activeTab === 'exam' && examText && !isGeneratingExam && (
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 relative animate-slide-up">
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <div className="flex items-center gap-2 text-green-700 bg-green-100 p-3 rounded-lg border border-green-200">
                                    <Award className="w-5 h-5 text-green-600 shrink-0" />
                                    <span className="font-semibold text-sm">Exam successfully generated! Grab a pen and paper.</span>
                                </div>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition-colors font-medium"
                                    title="Download as PDF"
                                >
                                    <Download className="w-4 h-4" /> Download PDF
                                </button>
                            </div>
                            {/* Simple Markdown Rendering via whitespace-pre-wrap */}
                            <div id="self-study-exam-content" className="prose prose-sm prose-indigo max-w-none text-gray-800 whitespace-pre-wrap font-serif leading-relaxed bg-white p-6 md:p-8 border border-gray-100 rounded-xl">
                                {examText}
                            </div>
                        </div>
                    )}

                    {/* Resources View */}
                    {activeTab === 'resources' && resources && !isGeneratingResources && (
                        <div className="bg-white rounded-xl animate-slide-up">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Curated Links for "{topic}"</h3>
                            <div className="space-y-3">
                                {resources.map((res, i) => (
                                    <a
                                        key={i}
                                        href={res.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:-translate-y-1 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                                {res.type === 'video' ? <Youtube className="w-5 h-5 text-red-500" /> : <BookOpen className="w-5 h-5 text-blue-500" />}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-900 group-hover:text-indigo-700 flex items-center gap-2">
                                                    {res.title}
                                                    <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-1">{res.description}</p>
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
