import { useMemo, useState } from 'react';
import { Search, Calendar, Trash2 } from 'lucide-react';
import { SectionHeading, RoleBadge, AdminPanel, AdminLoading } from './Shared';
import { formatDate } from '../utils';

interface UsersPanelProps {
  users: { id: string; email: string | null; role: string; created_at: string }[];
  isLoading: boolean;
  onUpdateRole: (id: string, newRole: string) => void;
  onDelete: (id: string) => void;
}

export function UsersPanel({ users, isLoading, onUpdateRole, onDelete }: UsersPanelProps) {
  const [query, setQuery] = useState('');
  const filteredUsers = useMemo(
    () => users.filter((u) => u.email?.toLowerCase().includes(query.toLowerCase())),
    [users, query],
  );

  if (isLoading) return <AdminLoading message="Ładowanie bazy użytkowników…" />;

  return (
    <AdminPanel>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
        <SectionHeading title="Użytkownicy" subtitle="Zarządzanie dostępem i uprawnieniami" />
        <div className="relative group min-w-[260px] max-w-md w-full">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/25 group-focus-within:text-gold-deep transition-colors"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po e-mailu…"
            className="w-full h-10 library-view-cell pl-10 pr-3 text-[10px] font-outfit font-semibold text-black placeholder:text-black/25 outline-none focus:border-gold-primary/40"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/[0.06] text-left bg-white/30">
              <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] text-black/35 italic font-outfit">
                Użytkownik
              </th>
              <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] text-black/35 italic font-outfit">
                Rola
              </th>
              <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] text-black/35 italic font-outfit">
                Rejestracja
              </th>
              <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] text-black/35 italic font-outfit text-right">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="group hover:bg-white/40 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border border-gold-primary/20 bg-gold-primary/8 flex items-center justify-center text-gold-deep text-[10px] font-black italic font-profile-display">
                      {u.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-black italic leading-none truncate font-outfit">
                        {u.email}
                      </p>
                      <span className="text-[7px] font-admin-mono text-black/30 mt-1 block truncate">{u.id}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-black/45">
                    <Calendar size={12} />
                    <span className="text-[9px] font-admin-mono">{formatDate(u.created_at)}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
                          onDelete(u.id);
                        }
                      }}
                      className="h-8 w-8 flex items-center justify-center rounded-lg border border-red-500/15 bg-red-500/5 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                      title="Usuń użytkownika"
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                      className="h-8 px-3 rounded-lg library-view-cell text-[8px] font-black uppercase tracking-widest text-black hover:border-gold-primary/35 transition-all font-outfit"
                    >
                      Zmień rolę
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPanel>
  );
}
