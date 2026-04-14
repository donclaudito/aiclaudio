import { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const statusLabel = {
  waiting: "Aguardando",
  uploading: "Enviando...",
  extracting: "Extraindo metadados...",
  saving: "Salvando...",
  done: "Concluído",
  error: "Erro",
};

export default function BulkUpload({ open, onClose, onComplete }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (newFiles) => {
    const pdfs = Array.from(newFiles).filter(f =>
      f.type === "application/pdf" || f.name.endsWith(".pdf") || f.name.endsWith(".doc") || f.name.endsWith(".docx")
    );
    setFiles(prev => [
      ...prev,
      ...pdfs.map(f => ({ file: f, name: f.name, status: "waiting", metadata: null, error: null }))
    ]);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const updateFile = (idx, patch) =>
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));

  const processAll = async () => {
    setProcessing(true);
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "done") continue;

      // 1. Upload file
      updateFile(i, { status: "uploading" });
      let file_url;
      try {
        const res = await base44.integrations.Core.UploadFile({ file: files[i].file });
        file_url = res.file_url;
      } catch {
        updateFile(i, { status: "error", error: "Falha no upload" });
        continue;
      }

      // 2. Extract metadata AND full text via LLM
      updateFile(i, { status: "extracting" });
      let metadata = { title: files[i].name.replace(/\.(pdf|doc|docx)$/i, ""), authors: "", abstract: "", published_date: "", source: "" };
      let full_text_content = "";
      try {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              authors: { type: "string" },
              abstract: { type: "string" },
              published_date: { type: "string" },
              journal_or_source: { type: "string" },
              keywords: { type: "array", items: { type: "string" } },
              full_text: { type: "string", description: "All text content from the document" },
            }
          }
        });
        if (extracted?.status === "success" && extracted.output) {
          const out = Array.isArray(extracted.output) ? extracted.output[0] : extracted.output;
          metadata = {
            title: out.title || metadata.title,
            authors: out.authors || "",
            abstract: out.abstract || "",
            published_date: out.published_date || "",
            source: out.journal_or_source || "",
            tags: out.keywords || [],
          };
          full_text_content = out.full_text || "";
        }
      } catch {
        // fallback to filename as title, continue
      }

      // 3. Save to DB
      updateFile(i, { status: "saving" });
      try {
        await base44.entities.Document.create({
          ...metadata,
          file_url,
          full_text_content,
          status: "pending",
        });
        await base44.entities.ActivityLog.create({
          action: `Documento adicionado via upload em massa: ${metadata.title}`,
          entity_type: "Document",
          status: "success",
        });
        updateFile(i, { status: "done", metadata });
      } catch {
        updateFile(i, { status: "error", error: "Falha ao salvar" });
      }
    }
    setProcessing(false);
  };

  const allDone = files.length > 0 && files.every(f => f.status === "done" || f.status === "error");
  const doneCount = files.filter(f => f.status === "done").length;
  const progressPct = files.length > 0 ? Math.round((files.filter(f => f.status === "done" || f.status === "error").length / files.length) * 100) : 0;

  const handleClose = () => {
    if (allDone) onComplete();
    setFiles([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-space flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-primary" /> Upload em Massa
          </DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
            dragging ? "border-primary bg-accent/60 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/40"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx" className="hidden"
            onChange={e => addFiles(e.target.files)} />
          <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-sm">Arraste arquivos aqui ou clique para selecionar</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX — múltiplos arquivos permitidos</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 mt-2">
            {processing && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{doneCount}/{files.length} concluídos</span>
                </div>
                <Progress value={progressPct} className="h-1.5" />
              </div>
            )}
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2.5">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.metadata?.title || f.name}</p>
                  {f.metadata?.authors && <p className="text-xs text-muted-foreground truncate">{f.metadata.authors}</p>}
                  <p className={cn("text-xs mt-0.5", {
                    "text-muted-foreground": f.status === "waiting",
                    "text-primary": ["uploading", "extracting", "saving"].includes(f.status),
                    "text-emerald-600": f.status === "done",
                    "text-red-500": f.status === "error",
                  })}>
                    {f.error || statusLabel[f.status]}
                  </p>
                </div>
                <div className="shrink-0">
                  {f.status === "done" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  {f.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {["uploading", "extracting", "saving"].includes(f.status) && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  )}
                  {f.status === "waiting" && !processing && (
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={processing}>
            {allDone ? "Fechar" : "Cancelar"}
          </Button>
          {!allDone && (
            <Button className="flex-1 gap-2" onClick={processAll} disabled={files.length === 0 || processing}>
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><Upload className="w-4 h-4" /> Processar {files.length > 0 ? `(${files.length})` : ""}</>}
            </Button>
          )}
          {allDone && (
            <Button className="flex-1 gap-2" onClick={handleClose}>
              <CheckCircle className="w-4 h-4" /> Concluído ({doneCount} salvos)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}