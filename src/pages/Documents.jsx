import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, FileText, ExternalLink, Trash2, CheckCircle, XCircle, Clock, Upload, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const statusConfig = {
  approved: { label: "Approved", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  pending: { label: "Pending", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
};

const emptyForm = {
  title: "", authors: "", source: "", url: "", abstract: "",
  notes: "", relevance_score: "", published_date: "", status: "pending", tags: []
};

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const load = async () => {
    const data = await base44.entities.Document.list("-created_date", 100);
    setDocs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = docs.filter(d => {
    const matchSearch = d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.authors?.toLowerCase().includes(search.toLowerCase()) ||
      d.source?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, file_url }));
    setUploadingFile(false);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    const payload = { ...form, relevance_score: form.relevance_score ? Number(form.relevance_score) : undefined };
    await base44.entities.Document.create(payload);
    await base44.entities.ActivityLog.create({ action: `Document added: ${form.title}`, entity_type: "Document", status: "success" });
    setShowForm(false);
    setForm(emptyForm);
    await load();
    setSaving(false);
  };

  const handleStatusChange = async (doc, status) => {
    await base44.entities.Document.update(doc.id, { status });
    await base44.entities.ActivityLog.create({ action: `Document ${status}: ${doc.title}`, entity_type: "Document", status: "success" });
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status } : d));
  };

  const handleDelete = async (doc) => {
    await base44.entities.Document.delete(doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-space text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Research papers and documents</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No documents found</p>
          <p className="text-sm mt-1">Add your first research document to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => {
            const sc = statusConfig[doc.status] || statusConfig.pending;
            return (
              <div key={doc.id} className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-colors group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm leading-snug">{doc.title}</h3>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0 ${sc.bg} ${sc.color}`}>
                        <sc.icon className="w-3 h-3" />{sc.label}
                      </span>
                    </div>
                    {doc.authors && <p className="text-xs text-muted-foreground mt-0.5">{doc.authors}</p>}
                    {doc.abstract && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.abstract}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {doc.source && <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{doc.source}</span>}
                      {doc.relevance_score && <span className="text-xs text-muted-foreground">Score: {doc.relevance_score}/10</span>}
                      {doc.tags?.map(t => (
                        <span key={t} className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.status !== "approved" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => handleStatusChange(doc, "approved")}>
                      <CheckCircle className="w-3 h-3" /> Approve
                    </Button>
                  )}
                  {doc.status !== "rejected" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => handleStatusChange(doc, "rejected")}>
                      <XCircle className="w-3 h-3" /> Reject
                    </Button>
                  )}
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                        <ExternalLink className="w-3 h-3" /> Open
                      </Button>
                    </a>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive ml-auto"
                    onClick={() => handleDelete(doc)}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Document Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-space">Add Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title *</Label>
              <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Document title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Authors</Label>
                <Input className="mt-1" value={form.authors} onChange={e => setForm(f => ({ ...f, authors: e.target.value }))} placeholder="Author names" />
              </div>
              <div>
                <Label>Source</Label>
                <Input className="mt-1" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="arXiv, NASA..." />
              </div>
            </div>
            <div>
              <Label>URL</Label>
              <Input className="mt-1" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Abstract</Label>
              <Textarea className="mt-1" rows={3} value={form.abstract} onChange={e => setForm(f => ({ ...f, abstract: e.target.value }))} placeholder="Document abstract or summary..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Relevance Score (0-10)</Label>
                <Input className="mt-1" type="number" min="0" max="10" value={form.relevance_score} onChange={e => setForm(f => ({ ...f, relevance_score: e.target.value }))} />
              </div>
              <div>
                <Label>Published Date</Label>
                <Input className="mt-1" type="date" value={form.published_date} onChange={e => setForm(f => ({ ...f, published_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag..." onKeyDown={e => e.key === "Enter" && handleAddTag()} />
                <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>Add</Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map(t => (
                    <span key={t} className="bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      {t}
                      <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Upload File (PDF)</Label>
              <div className="mt-1 flex items-center gap-2">
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} />
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={uploadingFile}>
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingFile ? "Uploading..." : form.file_url ? "File Uploaded ✓" : "Upload File"}
                  </Button>
                </label>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.title}>
                {saving ? "Saving..." : "Save Document"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}