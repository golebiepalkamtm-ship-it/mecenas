import { useMemo, useState } from "react";
import { Search, Calendar, Trash2 } from "lucide-react";
import { SectionHeading, RoleBadge } from "./Shared";
import { formatDate } from "../utils";

interface UsersPanelProps {
  users: any[];
  isLoading: boolean;
  onUpdateRole: (id: string, newRole: string) => void;
  onDelete: (id: string) => void;
}

export function UsersPanel({ users, isLoading, onUpdateRole, onDelete }: UsersPanelProps) {
  const [query, setQuery] = useState("");
  const filteredUsers = useMemo(() => 
    users.filter(u => u.email?.toLowerCase().includes(query.toLowerCase())),
    [users, query]
  );

  if (isLoading) return <div className="p-20 text-center animate-pulse">Ładowanie bazy użytkowników...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass-prestige rounded-3xl p-8 border border-white/60 bg-white/40 shadow-[0_40px_80px_rgba(0,0,0,0.1),inset_0_2px_10px_rgba(255,255,255,0.9)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <SectionHeading title="Baza Użytkowników" subtitle="Zarządzanie dostępem i uprawnieniami" />
          <div className="relative group min-w-[300px]">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20 group-focus-within:text-gold-primary transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj po e-mailu..."
              className="w-full h-10 bg-white/10 border border-white/40 rounded-xl px-12 text-[10px] font-black uppercase tracking-widest text-black placeholder:text-black/10 outline-none focus:border-gold-primary transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 text-left">
                <th className="pb-4 text-[8px] font-black uppercase tracking-[0.2em] text-black/30 italic">Użytkownik</th>
                <th className="pb-4 text-[8px] font-black uppercase tracking-[0.2em] text-black/30 italic px-4">Rola</th>
                <th className="pb-4 text-[8px] font-black uppercase tracking-[0.2em] text-black/30 italic px-4">Data rejestracji</th>
                <th className="pb-4 text-[8px] font-black uppercase tracking-[0.2em] text-black/30 italic text-right text-transparent">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gold-primary/5 border border-gold-primary/10 flex items-center justify-center text-gold-primary text-[10px] font-black italic">
                        {u.email?.[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-black italic leading-none">{u.email}</p>
                        <span className="text-[7px] font-semibold text-black/20 uppercase tracking-widest mt-1.5 block">ID: {u.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4"><RoleBadge role={u.role} /></td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2 text-black/40">
                      <Calendar size={12} />
                      <span className="text-[9px] font-black">{formatDate(u.created_at)}</span>
                    </div>
                  </td>
                  <td className="py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          if (window.confirm("Czy na pewno chcesz usunąć tego użytkownika?")) {
                            onDelete(u.id);
                          }
                        }} 
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        title="Usuń użytkownika"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button onClick={() => onUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')} className="h-8 px-4 rounded-lg bg-white/5 border border-black/10 text-[8px] font-black uppercase tracking-widest text-black hover:bg-gold-primary/10 hover:text-gold-primary transition-all">
                        Zmień Rolę
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
