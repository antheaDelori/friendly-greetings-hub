import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/gestione_/liste")({
  head: () => ({
    meta: [
      { title: "Liste di distribuzione — Liberiamo la mente" },
      { name: "description", content: "Crea e gestisci le tue liste di distribuzione lettori." },
    ],
  }),
  component: GestioneListePage,
});

type DistributionList = { id: string; nome: string; created_at: string };
type Member = { id: string; email: string; nome: string | null };

const inputClass =
  "border border-amber/30 bg-void/40 px-3 py-2 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-amber transition-all text-sm";

function GestioneListePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [lists, setLists] = useState<DistributionList[]>([]);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [knownEmails, setKnownEmails] = useState<string[]>([]);

  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamingBusy, setRenamingBusy] = useState(false);

  const [expandedListIds, setExpandedListIds] = useState<Set<string>>(new Set());
  const [membersByList, setMembersByList] = useState<Record<string, Member[]>>({});
  const [loadingMembersFor, setLoadingMembersFor] = useState<Set<string>>(new Set());

  const [newMemberEmail, setNewMemberEmail] = useState<Record<string, string>>({});
  const [newMemberNome, setNewMemberNome] = useState<Record<string, string>>({});
  const [addingMemberFor, setAddingMemberFor] = useState<string | null>(null);

  const [deleteConfirmListId, setDeleteConfirmListId] = useState<string | null>(null);
  const [deleteLinkedCount, setDeleteLinkedCount] = useState<number | null>(null);
  const [deletingList, setDeletingList] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace("/auth"); return; }
      setUserId(user.id);
      const adminEmail = user.email?.toLowerCase() === (import.meta.env.VITE_ADMIN_EMAIL as string)?.toLowerCase();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_author")
        .eq("id", user.id)
        .single();

      if (!adminEmail && !profileData?.is_author) {
        window.location.replace("/auth/profilo-autore");
        return;
      }

      await loadLists(user.id);
      await loadKnownEmails(user.id);
      setLoading(false);
    };
    init();
  }, []);

  const loadLists = async (uid: string) => {
    const { data } = await supabase
      .from("distribution_lists")
      .select("id, nome, created_at")
      .eq("author_id", uid)
      .order("nome");
    setLists(data ?? []);
  };

  // Email già note all'autore (follower + membri di qualunque sua DL), per
  // l'autocompletamento quando aggiunge un nominativo — evita di doverle
  // riscrivere se sono già presenti altrove.
  const loadKnownEmails = async (uid: string) => {
    const [{ data: followerRows }, { data: memberRows }] = await Promise.all([
      supabase.from("author_followers").select("email").eq("author_id", uid),
      supabase.from("distribution_list_members").select("email, distribution_lists!inner(author_id)").eq("distribution_lists.author_id", uid),
    ]);
    const emails = new Set<string>();
    (followerRows ?? []).forEach((r: { email: string }) => emails.add(r.email));
    (memberRows ?? []).forEach((r: { email: string }) => emails.add(r.email));
    setKnownEmails(Array.from(emails).sort());
  };

  const handleCreateList = async () => {
    if (!userId || !newListName.trim() || creatingList) return;
    setCreatingList(true);
    setListError(null);
    const { error } = await supabase
      .from("distribution_lists")
      .insert({ author_id: userId, nome: newListName.trim() });
    if (error) {
      setListError(error.message.includes("duplicate") || error.code === "23505"
        ? "Hai già una lista con questo nome."
        : error.message);
    } else {
      setNewListName("");
      await loadLists(userId);
    }
    setCreatingList(false);
  };

  const handleStartRename = (list: DistributionList) => {
    setRenamingListId(list.id);
    setRenameValue(list.nome);
  };

  const handleSaveRename = async (id: string) => {
    if (!renameValue.trim() || renamingBusy) return;
    setRenamingBusy(true);
    const { error } = await supabase
      .from("distribution_lists")
      .update({ nome: renameValue.trim(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setLists(prev => prev.map(l => l.id === id ? { ...l, nome: renameValue.trim() } : l).sort((a, b) => a.nome.localeCompare(b.nome)));
      setRenamingListId(null);
    } else {
      setListError(error.message);
    }
    setRenamingBusy(false);
  };

  const toggleExpand = async (listId: string) => {
    const next = new Set(expandedListIds);
    const opening = !next.has(listId);
    if (opening) next.add(listId); else next.delete(listId);
    setExpandedListIds(next);
    if (opening && !membersByList[listId]) {
      setLoadingMembersFor(prev => new Set(prev).add(listId));
      const { data } = await supabase
        .from("distribution_list_members")
        .select("id, email, nome")
        .eq("list_id", listId)
        .order("email");
      setMembersByList(prev => ({ ...prev, [listId]: data ?? [] }));
      setLoadingMembersFor(prev => { const n = new Set(prev); n.delete(listId); return n; });
    }
  };

  const handleAddMember = async (listId: string) => {
    const email = (newMemberEmail[listId] ?? "").trim().toLowerCase();
    if (!email || addingMemberFor) return;
    setAddingMemberFor(listId);
    const nome = (newMemberNome[listId] ?? "").trim() || null;
    const { error } = await supabase
      .from("distribution_list_members")
      .upsert({ list_id: listId, email, nome }, { onConflict: "list_id,email", ignoreDuplicates: true });
    if (!error) {
      setNewMemberEmail(prev => ({ ...prev, [listId]: "" }));
      setNewMemberNome(prev => ({ ...prev, [listId]: "" }));
      const { data } = await supabase
        .from("distribution_list_members")
        .select("id, email, nome")
        .eq("list_id", listId)
        .order("email");
      setMembersByList(prev => ({ ...prev, [listId]: data ?? [] }));
      setKnownEmails(prev => prev.includes(email) ? prev : [...prev, email].sort());
    } else {
      setListError(error.message);
    }
    setAddingMemberFor(null);
  };

  const handleRemoveMember = async (listId: string, memberId: string) => {
    await supabase.from("distribution_list_members").delete().eq("id", memberId);
    setMembersByList(prev => ({ ...prev, [listId]: (prev[listId] ?? []).filter(m => m.id !== memberId) }));
  };

  const handleDeleteRequest = async (listId: string) => {
    const { count } = await supabase
      .from("book_distribution_lists")
      .select("id", { count: "exact", head: true })
      .eq("list_id", listId);
    setDeleteLinkedCount(count ?? 0);
    setDeleteConfirmListId(listId);
  };

  const handleConfirmDelete = async (listId: string) => {
    if (!userId || deletingList) return;
    setDeletingList(true);
    const { error } = await supabase.from("distribution_lists").delete().eq("id", listId);
    if (!error) {
      setDeleteConfirmListId(null);
      setDeleteLinkedCount(null);
      await loadLists(userId);
    } else {
      setListError(error.message);
    }
    setDeletingList(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <PageShell code="// LISTE DI DISTRIBUZIONE" title="Le tue Liste di Distribuzione">
          <p className="font-mono text-[10px] text-bone/30 tracking-widest uppercase">Caricamento...</p>
        </PageShell>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell
        code="// LISTE DI DISTRIBUZIONE"
        title="Le tue Liste di Distribuzione"
        subtitle="Gruppi di lettori riutilizzabili: colleghili a un'opera per dare accesso in lettura, o selezionali per inviare una comunicazione."
      >
        <div className="space-y-6">
          <HudPanel label="nuova lista" tone="magenta">
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateList()}
                placeholder="Nome lista (es. Beta reader, Famiglia, Stampa)"
                className={`${inputClass} flex-1 min-w-64`}
              />
              <HudButton variant="magenta" onClick={handleCreateList} disabled={creatingList || !newListName.trim()}>
                {creatingList ? "▸ Creazione..." : "▸ Crea lista"}
              </HudButton>
            </div>
            {listError && <p className="mt-2 font-mono text-[10px] text-magenta tracking-widest">✗ {listError}</p>}
          </HudPanel>

          {lists.length === 0 ? (
            <p className="font-mono text-[10px] text-bone/30 tracking-widest uppercase">
              Nessuna lista creata ancora — crea la prima qui sopra.
            </p>
          ) : (
            lists.map(list => {
              const members = membersByList[list.id];
              const isOpen = expandedListIds.has(list.id);
              const isLoadingMembers = loadingMembersFor.has(list.id);
              return (
                <HudPanel key={list.id} tone="cyan" label={list.nome} code={members ? `${members.length} membri` : undefined}>
                  <div className="space-y-3">
                    {renamingListId === list.id ? (
                      <div className="flex gap-2 flex-wrap">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSaveRename(list.id)}
                          className={`${inputClass} flex-1 min-w-48`}
                        />
                        <HudButton variant="ghost" onClick={() => handleSaveRename(list.id)} disabled={renamingBusy || !renameValue.trim()}>
                          ✓ Salva
                        </HudButton>
                        <HudButton variant="ghost" onClick={() => setRenamingListId(null)}>Annulla</HudButton>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleExpand(list.id)}
                          className="font-mono text-[10px] tracking-widest text-cyan uppercase cursor-pointer"
                        >
                          {isOpen ? "▼" : "▶"} ◈ {isOpen ? "Nascondi" : "Mostra"} nominativi
                        </button>
                        <HudButton variant="ghost" onClick={() => handleStartRename(list)}>◆ Rinomina</HudButton>
                        {deleteConfirmListId === list.id ? null : (
                          <HudButton variant="ghost" onClick={() => handleDeleteRequest(list.id)}>⊗ Elimina</HudButton>
                        )}
                      </div>
                    )}

                    {deleteConfirmListId === list.id && (
                      <div className="border border-magenta/30 bg-magenta/5 p-3 space-y-2">
                        <p className="font-serif text-sm text-bone/80">
                          {deleteLinkedCount && deleteLinkedCount > 0
                            ? `Questa lista è collegata a ${deleteLinkedCount} opera/e: eliminandola, quei lettori perderanno l'accesso concesso tramite questa lista. Confermi?`
                            : "Eliminare questa lista? L'azione non è reversibile."}
                        </p>
                        <div className="flex gap-2">
                          <HudButton variant="magenta" onClick={() => handleConfirmDelete(list.id)} disabled={deletingList}>
                            {deletingList ? "..." : "⊗ Conferma eliminazione"}
                          </HudButton>
                          <HudButton variant="ghost" onClick={() => { setDeleteConfirmListId(null); setDeleteLinkedCount(null); }}>
                            Annulla
                          </HudButton>
                        </div>
                      </div>
                    )}

                    {isOpen && (
                      isLoadingMembers ? (
                        <p className="font-mono text-[10px] text-bone/30 tracking-widest uppercase">Caricamento...</p>
                      ) : (
                        <div className="space-y-3">
                          {members && members.length > 0 && (
                            <div className="space-y-0.5">
                              {members.map(m => (
                                <div key={m.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-cyan/10">
                                  <div>
                                    <span className="font-serif text-sm text-bone/80">{m.email}</span>
                                    {m.nome && <span className="ml-2 font-mono text-[9px] text-bone/40">{m.nome}</span>}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveMember(list.id, m.id)}
                                    className="font-mono text-[9px] text-bone/20 hover:text-magenta transition-colors cursor-pointer shrink-0"
                                  >
                                    ✕ rimuovi
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <input
                              type="text"
                              value={newMemberNome[list.id] ?? ""}
                              onChange={e => setNewMemberNome(prev => ({ ...prev, [list.id]: e.target.value }))}
                              placeholder="Nome (opzionale)"
                              className={`${inputClass} w-40`}
                            />
                            <input
                              type="email"
                              list="known-emails"
                              value={newMemberEmail[list.id] ?? ""}
                              onChange={e => setNewMemberEmail(prev => ({ ...prev, [list.id]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && handleAddMember(list.id)}
                              placeholder="email@esempio.it"
                              className={`${inputClass} flex-1 min-w-48`}
                            />
                            <HudButton
                              variant="ghost"
                              onClick={() => handleAddMember(list.id)}
                              disabled={addingMemberFor === list.id || !(newMemberEmail[list.id] ?? "").includes("@")}
                            >
                              {addingMemberFor === list.id ? "▸ Aggiunta..." : "▸ Aggiungi"}
                            </HudButton>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </HudPanel>
              );
            })
          )}

          <Link to="/gestione" className="inline-block font-mono text-[10px] tracking-widest text-bone/40 hover:text-cyan uppercase transition-colors">
            ← Torna a Gestione
          </Link>
        </div>

        <datalist id="known-emails">
          {knownEmails.map(email => <option key={email} value={email} />)}
        </datalist>
      </PageShell>
      <SiteFooter />
    </div>
  );
}
