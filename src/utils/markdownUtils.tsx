import React from 'react';

const formatBold = (text: string) => {
    // Handle bold and italic
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return formatted;
};

export const renderMarkdown = (text: string) => {
    if (!text) return null;

    // Split by double newline to get blocks
    const sections = text.split('\n\n');

    return (
        <div className="space-y-4">
            {sections.map((section, idx) => {
                const trimmed = section.trim();
                if (!trimmed) return null;

                if (trimmed.startsWith('### ')) {
                    return <h4 key={idx} className="text-lg font-bold text-gray-800 mt-6" dangerouslySetInnerHTML={{ __html: formatBold(trimmed.replace('### ', '')) }} />;
                }
                if (trimmed.startsWith('## ')) {
                    return <h3 key={idx} className="text-xl font-extrabold text-indigo-900 mt-8 mb-2 border-b border-gray-100 pb-2" dangerouslySetInnerHTML={{ __html: formatBold(trimmed.replace('## ', '')) }} />;
                }
                if (trimmed.startsWith('# ')) {
                    return <h2 key={idx} className="text-2xl font-black text-indigo-900 mb-4" dangerouslySetInnerHTML={{ __html: formatBold(trimmed.replace('# ', '')) }} />;
                }

                // Handle Lists
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
                    const items = trimmed.split('\n');
                    const isOrdered = /^\d+\.\s/.test(items[0]);

                    const ListTag = isOrdered ? 'ol' : 'ul';
                    const listClass = isOrdered ? 'list-decimal pl-6 space-y-2 text-gray-700 font-medium' : 'list-disc pl-6 space-y-2 text-gray-700';

                    return (
                        <ListTag key={idx} className={listClass}>
                            {items.map((item, i) => {
                                const cleanItem = item.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
                                return <li key={i} dangerouslySetInnerHTML={{ __html: formatBold(cleanItem) }} className="leading-relaxed" />;
                            })}
                        </ListTag>
                    )
                }

                // Regular paragraphs (split by single newlines just in case)
                return (
                    <p
                        key={idx}
                        className="text-gray-700 text-[15px] leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatBold(trimmed.replace(/\n/g, '<br />')) }}
                    />
                );
            })}
        </div>
    );
};
