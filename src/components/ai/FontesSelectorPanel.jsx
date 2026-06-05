import { BookOpen, CheckSquare, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FontesSelectorPanel({ docs, selectedIds, onToggle, onSelectAll, onClearAll, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-xs">Carregando documentos...</span>
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-40" />
        <p className="text-xs">Nenhum documento aprovado disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 mb-3">
        <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={onSelectAll}>
          Selecionar todos
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={onClearAll}>
          Limpar
        </Button>
      </div>

      {docs.map((doc) => {
        const isSelected = selectedIds.includes(doc.id);
        return (
          <button
            key={doc.id}
            onClick={() => onToggle(doc.id)}
            className={`w-full text-left p-2 rounded-lg border transition-colors text-xs ${
              isSelected
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border hover:border-primary/30 hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            <div className="flex items-start gap-2">
              {isSelected
                ? <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                : <Square className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              }
              <div className="min-w-0">
                <p className="font-medium text-foreground line-clamp-2 leading-tight">{doc.title}</p>
                {doc.authors && <p className="text-muted-foreground mt-0.5 truncate">{doc.authors}</p>}
                {doc.source && (
                  <span className="inline-block mt-1 text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {doc.source}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}