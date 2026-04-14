import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Database, Globe, RefreshCw, Trash2, CheckCircle, AlertCircle, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const typeConfig = {
  arxiv: { label: "arXiv", color: "bg-blue-50 text-blue-700" },
  pubmed: { label: "PubMed", color: "bg-green-50 text-green-700" },
  nasa: { label: "NASA", color: "bg-orange-50 text-orange-700" },
  web: { label: "Web", color: "bg-purple-50 text-purple-700" },
  manual: { label: "Manual", color: "bg-gray-100 text-gray-700" },
  other: { label: "Other", color: "bg-gray-100 text-gray-700" },
};

const emptyForm = { name: "", type: "arxiv", url: "", query: "", description: "", status: "active" };

export default function Sources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await base44.entities.DataSource.list("-created_date", 100);
    setSources(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    await base44.entities.DataSource.create(form);
    await base44.entities.ActivityLog.create({ action: `Data source added: ${form.name}`, entity_type: "DataSource", status: "success" });
    setShowForm(false);
    setForm(emptyForm);
    await load();
    setSaving(false);
  };

  const toggleStatus = async (src) => {
    const newStatus = src.status === "active" ? "inactive" : "active";
    await base44.entities.DataSource.update(src.id, { status: newStatus });
    setSources(prev => prev.map(s => s.id === src.id ? { ...s, status: newStatus } : s));
  };

  const handleDelete = async (src) => {
    await base44.entities.DataSource.delete(src.id);
    setSources(prev => prev.filter(s => s.id !== src.id));
  };

  const statusIcon = (status) => {
    if (status === "active") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === "error") return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Pause className="w-4 h-4 text-gray-400" />;
  };

  const activeCount = sources.filter(s => s.status === "active").length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-space text-2xl font-bold">Fontes de Dados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{activeCount} ativas de {sources.length} fontes</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar Fonte
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma fonte de dados ainda</p>
          <p className="text-sm mt-1">Configure suas fontes de dados de pesquisa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((src) => {
            const tc = typeConfig[src.type] || typeConfig.other;
            return (
              <div key={src.id} className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {statusIcon(src.status)}
                    <h3 className="font-medium">{src.name}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tc.color}`}>{tc.label}</span>
                </div>
                {src.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{src.description}</p>}
                {src.query && (
                  <div className="bg-muted rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-muted-foreground">Query:</p>
                    <p className="text-xs font-mono mt-0.5">{src.query}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  {src.url && (
                    <a href={src.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors truncate">
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="truncate">{src.url}</span>
                    </a>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{src.documents_count || 0} documents</span>
                    {src.last_fetched && <span>· {format(new Date(src.last_fetched), "MMM d")}</span>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => toggleStatus(src)}>
                      {src.status === "active" ? <><Pause className="w-3 h-3" /> Pausar</> : <><RefreshCw className="w-3 h-3" /> Ativar</>}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(src)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-space">Adicionar Fonte de Dados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome *</Label>
              <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: arXiv Artigos de Antigravidade" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="arxiv">arXiv</SelectItem>
                  <SelectItem value="pubmed">PubMed</SelectItem>
                  <SelectItem value="nasa">NASA</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL Base</Label>
              <Input className="mt-1" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Query de Busca</Label>
              <Input className="mt-1" value={form.query} onChange={e => setForm(f => ({ ...f, query: e.target.value }))} placeholder="ex: antigravidade propulsão" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea className="mt-1" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name}>
                {saving ? "Salvando..." : "Adicionar Fonte"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}