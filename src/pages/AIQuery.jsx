import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { BrainCircuit, Send, Globe, Trash2, Clock, Copy, CheckCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

const SUGGESTED = [
  "What is the current scientific consensus on antigravity research?",
  "Explain the Podkletnov effect and its experimental results",
  "What are the main theoretical frameworks for gravitational shielding?",
  "Summarize recent NASA research on advanced propulsion systems",
  "What quantum gravity theories could explain antigravity phenomena?",
];

export default function AIQuery() {
  const [question, setQuestion] = useState("");
  const [useInternet, setUseInternet] = useState(true);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.entities.AIQuery.list("-created_date", 20).then(setHistory);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const handleSubmit = async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion("");
    setLoading(true);

    const tempId = Date.now().toString();
    const tempEntry = { id: tempId, question: q, answer: null, status: "pending", created_date: new Date().toISOString(), use_internet: useInternet };
    setHistory(prev => [tempEntry, ...prev]);

    const prompt = `You are a scientific research assistant specializing in antigravity and advanced propulsion physics.

Answer the following question with scientific rigor. Cite relevant research, theories, and experiments when possible. Be thorough but concise.

Question: ${q}`;

    const answer = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: useInternet,
    });

    const saved = await base44.entities.AIQuery.create({
      question: q,
      answer,
      status: "completed",
      use_internet: useInternet,
    });

    await base44.entities.ActivityLog.create({
      action: "AI Query executed",
      entity_type: "AIQuery",
      entity_id: saved.id,
      details: q.substring(0, 80),
      status: "success"
    });

    setHistory(prev => prev.map(e => e.id === tempId ? saved : e));
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.AIQuery.delete(id);
    setHistory(prev => prev.filter(e => e.id !== id));
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Header */}
      <div className="px-6 md:px-8 py-5 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-space text-2xl font-bold flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-primary" /> AI Query
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Ask anything about antigravity research</p>
          </div>
          <div className="flex items-center gap-2">
            <Globe className={`w-4 h-4 ${useInternet ? "text-primary" : "text-muted-foreground"}`} />
            <Label className="text-sm">Web context</Label>
            <Switch checked={useInternet} onCheckedChange={setUseInternet} />
          </div>
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-6">
        {history.length === 0 && !loading && (
          <div className="text-center py-10">
            <Sparkles className="w-10 h-10 mx-auto mb-4 text-primary/40" />
            <p className="font-medium text-muted-foreground">Start exploring antigravity research</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Ask a question or choose a suggestion below</p>
            <div className="grid grid-cols-1 gap-2 max-w-lg mx-auto">
              {SUGGESTED.map((s) => (
                <button key={s} className="text-left text-sm p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-colors"
                  onClick={() => setQuestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {[...history].reverse().map((entry) => (
          <div key={entry.id} className="space-y-3">
            {/* Question */}
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-2xl text-sm">
                {entry.question}
              </div>
            </div>

            {/* Answer */}
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-2xl relative group">
                {entry.status === "pending" || !entry.answer ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-sm max-w-none text-foreground">
                      <ReactMarkdown>{entry.answer}</ReactMarkdown>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(entry.created_date), "MMM d, HH:mm")}
                      </span>
                      {entry.use_internet && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" /> Web
                        </span>
                      )}
                      <div className="ml-auto flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleCopy(entry.answer, entry.id)}>
                          {copied === entry.id ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(entry.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 md:px-8 py-4 border-t border-border bg-card/50 shrink-0">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <Textarea
            className="flex-1 resize-none min-h-[48px] max-h-32"
            placeholder="Ask about antigravity research..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            rows={1}
          />
          <Button onClick={handleSubmit} disabled={!question.trim() || loading} className="shrink-0 h-12 w-12 p-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}