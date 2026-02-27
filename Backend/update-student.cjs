const fs = require('fs');
let code = fs.readFileSync('components/StudentView.tsx', 'utf8');

// Chunk 1
code = code.replace(
    "import { raiseDoubt, Doubt } from '../services/classroomSync';",
    "import { raiseDoubt, Doubt, subscribeToDoubts } from '../services/classroomSync';"
);

// Chunk 2
code = code.replace(
    /const \[attentionStatus(.*?);\r?\n  const \[showAttentionAlert(.*?);/m,
    "const [attentionStatus$1;\n  const [showAttentionAlert$2;\n  const [myDoubts, setMyDoubts] = React.useState<Doubt[]>([]);\n\n  React.useEffect(() => {\n    const unsub = subscribeToDoubts((doubts) => {\n      setMyDoubts(doubts);\n    });\n    return () => unsub();\n  }, []);"
);

// Chunk 3
const newWidget = `          <ChatInterface lesson={lesson} />

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
        </div>`;

code = code.replace(
    /          <ChatInterface lesson=\{lesson\} \/>\r?\n        <\/div>/,
    newWidget
);

fs.writeFileSync('components/StudentView.tsx', code);
console.log("Updated StudentView.tsx");
