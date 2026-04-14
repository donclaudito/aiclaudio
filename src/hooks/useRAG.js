import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const MAX_CHARS_PER_DOC = 8000;

export function useRAG() {
  const [approvedDocs, setApprovedDocs] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    base44.entities.Document.filter({ status: "approved" }, "-relevance_score", 50)
      .then(docs => {
        setApprovedDocs(docs);
        setLoadingDocs(false);
      });
  }, []);

  const toggleDoc = (id) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedDocIds(approvedDocs.map(d => d.id));
  const clearAll = () => setSelectedDocIds([]);

  const buildSystemPrompt = (question, useInternet) => {
    const selected = approvedDocs.filter(d => selectedDocIds.includes(d.id));

    if (selected.length === 0) {
      return `Você é um assistente de pesquisa científica especializado em antigravidade e física de propulsão avançada.
Responda com rigor científico, citando pesquisas e teorias relevantes.

Pergunta: ${question}`;
    }

    const docContexts = selected.map((doc, i) => {
      const content = doc.full_text_content
        ? doc.full_text_content.substring(0, MAX_CHARS_PER_DOC)
        : doc.abstract || "";
      return `--- DOCUMENTO ${i + 1}: ${doc.title} ---
Autores: ${doc.authors || "N/A"}
Fonte: ${doc.source || "N/A"}
${content}
--- FIM DOCUMENTO ${i + 1} ---`;
    });

    return `Você é um assistente de pesquisa científica especializado em antigravidade e física de propulsão avançada.

INSTRUÇÕES CRÍTICAS:
1. Responda PRIORITARIAMENTE com base nos documentos fornecidos abaixo.
2. Ao usar informações dos documentos, cite explicitamente o título do documento.
3. Se a informação NÃO estiver nos documentos, informe: "Esta informação não está disponível nos documentos anexados."${useInternet ? " Você PODE complementar com conhecimento geral." : " Não utilize conhecimento externo."}
4. Seja rigoroso e científico.

DOCUMENTOS ANEXADOS:
${docContexts.join("\n\n")}

PERGUNTA: ${question}`;
  };

  return {
    approvedDocs,
    selectedDocIds,
    loadingDocs,
    toggleDoc,
    selectAll,
    clearAll,
    buildSystemPrompt,
    hasSelectedDocs: selectedDocIds.length > 0,
  };
}