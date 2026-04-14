import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { FileText, Database, BrainCircuit, CheckCircle, Clock, AlertCircle, ArrowRight, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [sources, setSources] = useState([]);
  const [logs, setLogs] = useState([]);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Document.list("-created_date", 5),
      base44.entities.DataSource.list("-created_date", 50),
      base44.entities.ActivityLog.list("-created_date", 5),
      base44.entities.AIQuery.list("-created_date", 50),
    ]).then(([d, s, l, q]) => {
      setDocs(d);
      setSources(s);
      setLogs(l);
      setQueries(q);
      setLoading(false);
    });
  }, []);

  const stats = [
    {
      label: "Documentos",
      value: loading ? "—" : docs.length,
      icon: FileText,
      color: "text-primary",
      bg: "bg-accent",
      link: "/documents",
    },
    {
      label: "Fontes Ativas",
      value: loading ? "—" : sources.filter(s => s.status === "active").length,
      icon: Database,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      link: "/sources",
    },
    {
      label: "Consultas IA",
      value: loading ? "—" : queries.length,
      icon: BrainCircuit,
      color: "text-violet-600",
      bg: "bg-violet-50",
      link: "/ai-query",
    },
    {
      label: "Aguardando Revisão",
      value: loading ? "—" : docs.filter(d => d.status === "pending").length,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      link: "/documents",
    },
  ];

  const statusIcon = (status) => {
    if (status === "success") return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    if (status === "error") return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    return <Clock className="w-3.5 h-3.5 text-amber-500" />;
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-space text-2xl font-bold text-foreground">Hub de Pesquisa</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestão de dados e interface de IA para pesquisa em antigravidade</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.link} className="group">
            <div className="bg-card rounded-xl border border-border p-5 hover:border-primary/40 hover:shadow-sm transition-all duration-200">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="text-2xl font-bold font-space text-foreground">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                {s.label}
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-space font-semibold text-foreground">Documentos Recentes</h2>
            <Link to="/documents" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento ainda. <Link to="/documents" className="text-primary hover:underline">Adicionar</Link></p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.source || "Unknown source"}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    doc.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                    doc.status === "rejected" ? "bg-red-50 text-red-700" :
                    "bg-amber-50 text-amber-700"
                  }`}>
                    {doc.status || "pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-space font-semibold text-foreground">Log de Atividades</h2>
            <Link to="/logs" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade ainda.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  {statusIcon(log.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.action}</p>
                    {log.details && <p className="text-xs text-muted-foreground truncate">{log.details}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(log.created_date), "HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sources Status */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-space font-semibold text-foreground">Status das Fontes de Dados</h2>
          <Link to="/sources" className="text-xs text-primary hover:underline flex items-center gap-1">
            Gerenciar <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : sources.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma fonte configurada. <Link to="/sources" className="text-primary hover:underline">Adicionar</Link></p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sources.map((src) => (
              <div key={src.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{src.type}</span>
                  <span className={`w-2 h-2 rounded-full ${src.status === "active" ? "bg-emerald-500" : src.status === "error" ? "bg-red-500" : "bg-gray-400"}`} />
                </div>
                <p className="text-sm font-medium truncate">{src.name}</p>
                <p className="text-xs text-muted-foreground">{src.documents_count || 0} docs</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}