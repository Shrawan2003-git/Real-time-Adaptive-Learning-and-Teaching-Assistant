import React, { useState, useEffect } from 'react';
import { Plus, Send, Trash2, Edit2, MessageSquare } from 'lucide-react';

interface DraftDoubt {
    id: string;
    text: string;
    createdAt: string;
}

interface MyDoubtsNotepadProps {
    onSendDoubt: (text: string) => void;
    disabled?: boolean;
}

export const MyDoubtsNotepad: React.FC<MyDoubtsNotepadProps> = ({ onSendDoubt, disabled }) => {
    const [drafts, setDrafts] = useState<DraftDoubt[]>([]);
    const [newDraft, setNewDraft] = useState('');

    // Load from local storage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('vta_student_drafts');
            if (saved) {
                setDrafts(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load drafts");
        }
    }, []);

    // Save to local storage when drafts change
    useEffect(() => {
        localStorage.setItem('vta_student_drafts', JSON.stringify(drafts));
    }, [drafts]);

    const handleAddDraft = () => {
        if (!newDraft.trim()) return;
        const draft: DraftDoubt = {
            id: Date.now().toString(),
            text: newDraft.trim(),
            createdAt: new Date().toISOString()
        };
        setDrafts([draft, ...drafts]);
        setNewDraft('');
    };

    const handleRemoveDraft = (id: string) => {
        setDrafts(drafts.filter(d => d.id !== id));
    };

    const handleSendDraft = (draft: DraftDoubt) => {
        if (disabled) {
            alert("Cannot send doubts during history revision or if session ended.");
            return;
        }
        onSendDoubt(draft.text);
        handleRemoveDraft(draft.id);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fadeIn">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-bold text-gray-800">My Doubts Notepad</h2>
                <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                    Personal Drafts
                </span>
            </div>

            <p className="text-gray-500 text-sm mb-6">
                Jot down questions as you learn. You can review them and send them to the teacher whenever you are ready.
            </p>

            {/* Input Section */}
            <div className="mb-8">
                <div className="flex gap-3">
                    <textarea
                        value={newDraft}
                        onChange={(e) => setNewDraft(e.target.value)}
                        placeholder="E.g., What is the difference between ionic and covalent bonds?"
                        className="flex-1 border border-gray-200 rounded-lg p-3 resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none text-sm h-20"
                    />
                    <button
                        onClick={handleAddDraft}
                        disabled={!newDraft.trim()}
                        className="self-end bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Save
                    </button>
                </div>
            </div>

            {/* Drafts List */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Saved Drafts ({drafts.length})</h3>

                {drafts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                        <Edit2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No drafts here yet. Start typing above!</p>
                    </div>
                ) : (
                    drafts.map(draft => (
                        <div key={draft.id} className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 group transition-colors hover:bg-amber-50">
                            <p className="text-gray-800 text-sm leading-relaxed mb-4">{draft.text}</p>

                            <div className="flex items-center justify-between border-t border-amber-100 pt-3">
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                                    {new Date(draft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleRemoveDraft(draft.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                        title="Delete Draft"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleSendDraft(draft)}
                                        disabled={disabled}
                                        className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                                    >
                                        <Send className="w-3 h-3" /> Send to Teacher
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
