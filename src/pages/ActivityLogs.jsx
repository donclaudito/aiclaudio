import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ScrollText, CheckCircle, AlertCircle, AlertTriangle, Search, Trash2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const statusConfig = {
  success: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
  error: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ActivityLog.list("-created_date", 200);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => {
    const matchSearch = l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleClearAll = async () => {
    for (const log of logs) {
      await base44.entities.ActivityLog.delete(log.id);
    }
    setLogs([]);
  };

  const counts = {
    success: logs.filter(l => l.status === "success").length,
    error: logs.filter(l => l.status === "error").length,
    warning: logs.filter(l => l.status === "warning").length,
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-space text-2xl font-bold">Activity Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{logs.length} total events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          {logs.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={handleClearAll}>
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(counts).map(([status, count]) => {
          const sc = statusConfig[status];
          return (
            <div key={status} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${sc.bg} flex items-center justify-center`}>
                <sc.icon className={`w-4 h-4 ${sc.color}`} />
              </div>
              <div>
                <div className="text-xl font-bold font-space">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">{status}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No logs found</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((log) => {
            const sc = statusConfig[log.status] || statusConfig.success;
            return (
              <div key={log.id} className="bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3 hover:border-primary/20 transition-colors">
                <sc.icon className={`w-4 h-4 shrink-0 ${sc.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{log.action}</p>
                  {log.details && <p className="text-xs text-muted-foreground truncate">{log.details}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {log.entity_type && (
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded hidden sm:block">
                      {log.entity_type}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_date), "MMM d, HH:mm")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}