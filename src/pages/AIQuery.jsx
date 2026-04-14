import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { BrainCircuit, Send, Globe, Trash2, Clock, Copy, CheckCheck, Sparkles, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { useRAG } from "@/hooks/useRAG";
import FontesSelectorPanel from "@/components/ai/FontesSelectorPanel";

const SUGGESTED = [
  "Qual é o consenso científico atual sobre pesquisa em antigravidade?",
  "Explique o efeito Podkletnov e seus resultados experimentais",
  "Quais são os principais frameworks teóricos para blindagem gravitacional?",
  "Resuma as pesquisas recentes da NASA sobre sistemas de propulsão avançada",
  "Quais teorias de gravidade quântica podem explicar fenômenos de antigravidade?",
];

export default function AIQuery() {
  const [question, setQuestion] = useState("");
  const [useInternet, setUseInternet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(null);
  const [showFontes, setShowFontes] = useState(true);
  const bottomRef = useRef(null);

  const { approvedDocs, selectedDocIds, loadingDocs, toggleDoc, selectAll, clearAll, buildSystemPrompt, hasSelectedDocs } = useRAG();

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
    const tempEntry = {
      id: tempId, question: q, answer: null, status: "pending",
      created_date: new Date().toISOString(), use_internet: useInternet,
      sources_count: selectedDocIds.length
    };
    setHistory(prev => [tempEntry, ...prev]);

    const prompt = buildSystemPrompt(q, useInternet);

    const answer = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: useInternet && !hasSelectedDocs,
      model: "gemini_3_flash",
    });

    const saved = await base44.entities.AIQuery.create({
      question: q,
      answer,
      status: "completed",
      use_internet: useInternet,
      model_used: "gemini_3_flash",
    });

    await base44.entities.ActivityLog.create({
      action: "AI Query (RAG) executada",
      entity_type: "AIQuery",
      entity_id: saved.id,
      details: `${q.substring(0, 60)} — ${selectedDocIds.length} doc(s) usados`,
      status: "success"
    });

    setHistory(prev => prev.map(e => e.id === tempId ? { ...saved, sources_count: selectedDocIds.length } : e));
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
    <div className="flex h-full max-h-screen overflow-hidden">
      {/* Left: Fontes Panel */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 border-r border-border bg-card/30">
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-space font-semibold text-sm flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-primary" />
              Fontes Anexadas
            </h2>
            {hasSelectedDocs && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                {selectedDocIds.length}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {hasSelectedDocs
              ? `IA responderá com base nos ${selectedDocIds.length} documento(s) selecionado(s)`
              : "Selecione documentos para RAG ou use conhecimento geral"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <FontesSelectorPanel
            docs={approvedDocs}
            selectedIds={selectedDocIds}
            onToggle={toggleDoc}
            onSelectAll={selectAll}
            onClearAll={clearAll}
            loading={loadingDocs}
          />
        </div>
      </div>

      {/* Right: Chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card/50 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="font-space text-xl font-bold flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary" /> Consulta IA
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasSelectedDocs
                  ? `Modo RAG ativo — ${selectedDocIds.length} fonte(s) anexada(s)`
                  : "Modo conhecimento geral"}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Mobile fontes toggle */}
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden gap-1.5 text-xs"
                onClick={() => setShowFontes(v => !v)}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Fontes {selectedDocIds.length > 0 && `(${selectedDocIds.length})`}
                {showFontes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <div className="flex items-center gap-2">
                <Globe className={`w-4 h-4 ${useInternet ? "text-primary" : "text-muted-foreground"}`} />
                <Label className="text-xs">Contexto web</Label>
                <Switch checked={useInternet} onCheckedChange={setUseInternet} />
              </div>
            </div>
          </div>

          {/* Mobile fontes panel */}
          {showFontes && (
            <div className="lg:hidden mt-3 p-3 rounded-lg bg-muted/40 border border-border">
              <FontesSelectorPanel
                docs={approvedDocs}
                selectedIds={selectedDocIds}
                onToggle={toggleDoc}
                onSelectAll={selectAll}
                onClearAll={clearAll}
                loading={loadingDocs}
              />
            </div>
          )}
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {history.length === 0 && !loading && (
            <div className="text-center py-10">
              <Sparkles className="w-10 h-10 mx-auto mb-4 text-primary/40" />
              <p className="font-medium text-muted-foreground">Comece a explorar a pesquisa em antigravidade</p>
              <p className="text-sm text-muted-foreground mt-1 mb-5">
                {hasSelectedDocs ? `${selectedDocIds.length} fonte(s) selecionada(s) — IA usará seus documentos` : "Selecione fontes no painel ou faça uma pergunta geral"}
              </p>
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
            <div key={entry.id} className="space-y-2.5">
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-2xl text-sm">
                  {entry.question}
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-2xl relative group">
                  {entry.status === "pending" || !entry.answer ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-sm">Consultando {hasSelectedDocs ? "documentos..." : "IA..."}</span>
                    </div>
                  ) : (
                    <>
                      <div className="prose prose-sm max-w-none text-foreground">
                        <ReactMarkdown>{entry.answer}</ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(entry.created_date), "MMM d, HH:mm")}
                        </span>
                        {entry.sources_count > 0 && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" /> {entry.sources_count} fonte(s)
                          </span>
                        )}
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
        <div className="px-5 py-4 border-t border-border bg-card/50 shrink-0">
          {hasSelectedDocs && (
            <div className="flex items-center gap-1.5 mb-2 text-xs text-emerald-600">
              <BookOpen className="w-3.5 h-3.5" />
              <span>RAG ativo: resposta baseada em {selectedDocIds.length} documento(s) selecionado(s)</span>
            </div>
          )}
          <div className="flex gap-3 max-w-4xl mx-auto">
            <Textarea
              className="flex-1 resize-none min-h-[48px] max-h-32"
              placeholder={hasSelectedDocs ? "Pergunte com base nos documentos selecionados..." : "Pergunte sobre pesquisa em antigravidade..."}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              rows={1}
            />
            <Button onClick={handleSubmit} disabled={!question.trim() || loading} className="shrink-0 h-12 w-12 p-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">Enter para enviar · Shift+Enter para nova linha</p>
        </div>
      </div>
    </div>
  );
}