import React, { useState } from 'react';
import { FileText, Loader2, Sparkles, RefreshCw, Download } from 'lucide-react';
import { generatePracticeExam } from '../services/geminiService';
// We use a regular import if html2pdf was installed via npm. If it doesn't have types we bypass TS typing momentarily.
import html2pdf from 'html2pdf.js';

interface ExamSimulatorProps {
    topic: string;
    level: string;
    apiKey?: string;
    disabled?: boolean;
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({ topic, level, apiKey, disabled }) => {
    const [examType, setExamType] = useState<'theory' | 'practical' | 'both'>('theory');
    const [totalMarks, setTotalMarks] = useState<number>(50);
    const [generatedExam, setGeneratedExam] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!topic || disabled) return;
        setIsGenerating(true);
        setError('');
        try {
            const examText = await generatePracticeExam(topic, level, examType, totalMarks, apiKey);
            setGeneratedExam(examText);
        } catch (err: any) {
            console.error(err);
            let errorMessage = err.message || 'Failed to generate practice exam. Please check your API key.';
            try {
                const parsed = JSON.parse(err.message);
                if (parsed.error && parsed.error.message) {
                    errorMessage = parsed.error.message;
                }
            } catch (e) {
                // Not JSON, keep original message
            }

            if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
                setError("API Quota exceeded (Too many requests). Please try again in a few seconds or check your billing plan. The free tier only allows a limited number of requests per minute.");
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadPDF = () => {
        const element = document.getElementById('exam-paper-content');
        if (!element) return;
        const opt = {
            margin: 1,
            filename: `${topic}-exam.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
        };
        html2pdf().set(opt).from(element).save();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fadeIn">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xl font-bold text-gray-800">Exam Simulator</h2>
                <span className="ml-auto text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Generated
                </span>
            </div>

            <p className="text-gray-500 text-sm mb-6">
                Generate custom practice papers based on the current lesson topic to test your knowledge and prepare for exams.
            </p>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                    {error}
                </div>
            )}

            {/* Configuration Form */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Type</label>
                    <div className="flex gap-2 p-1 bg-white border border-gray-200 rounded-lg">
                        {(['theory', 'practical', 'both'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setExamType(type)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${examType === type ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Total Marks ({totalMarks})</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={totalMarks}
                            onChange={(e) => setTotalMarks(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span className="text-sm font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded w-12 text-center">
                            {totalMarks}
                        </span>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || disabled}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" /> Generating Paper...
                            </>
                        ) : (
                            <>
                                {generatedExam ? <RefreshCw className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                {generatedExam ? 'Generate New Paper' : 'Generate Practice Paper'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Display */}
            {generatedExam && (
                <div className="bg-white border-2 border-indigo-50 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-indigo-50 px-6 py-4 flex items-center justify-between border-b border-indigo-100">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                <FileText className="w-5 h-5" /> Practice Exam Paper
                            </h3>
                            <button
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded shadow-sm transition-colors font-medium"
                                title="Download as PDF"
                            >
                                <Download className="w-3.5 h-3.5" /> Download PDF
                            </button>
                        </div>
                        <span className="text-xs font-semibold text-indigo-700 bg-white px-2 py-1 rounded shadow-sm">
                            {examType.toUpperCase()} | {totalMarks} Marks
                        </span>
                    </div>

                    <div id="exam-paper-content" className="bg-white p-8">
                        <div className="prose prose-indigo max-w-none prose-headings:text-indigo-900 prose-a:text-indigo-600 text-gray-800 format-markdown">
                            <div className="whitespace-pre-wrap font-sans leading-relaxed text-[15px]">
                                {generatedExam}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
