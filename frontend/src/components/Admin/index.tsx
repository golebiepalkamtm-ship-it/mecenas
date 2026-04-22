import { useState } from "react";
import { 
  Users, 
  Settings, 
  Shield, 
  Cpu 
} from "lucide-react";
import { useAdminUsers, useApiManagement, useAdminSystem } from "../../hooks";
import { SecurityPanel } from "./components/SecurityPanel";
import { ModelsPanel } from "./components/ModelsPanel";
import { SystemPanel } from "./components/SystemPanel";
import { UsersPanel } from "./components/UsersPanel";
import { 
  TabButton 
} from "./components/Shared";
import type { AdminTab, AdminTabConfig } from "./types";

const TABS: AdminTabConfig[] = [
  { id: "system", label: "Stan Systemu", icon: Settings },
  { id: "security", label: "Klucze API", icon: Shield },
  { id: "models", label: "Modele AI", icon: Cpu },
  { id: "users", label: "Użytkownicy", icon: Users },
];

export function AdminView() {
  const [activeTab, setActiveTab] = useState<AdminTab>("system");

  const { users, isLoading: usersLoading, updateUserRole, deleteUser } = useAdminUsers();
  const { providers, toggleProvider, updateProviderKey, addProvider, removeProvider } = useApiManagement();
  const { stats, services, isLoading: systemLoading } = useAdminSystem();

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden px-6 pb-6 mt-16 lg:mt-0">
      {/* Dynamic Tab Switcher */}
      <div className="z-50 py-8 flex items-center justify-center">
        <div className="glass-prestige p-2 rounded-3xl border border-black/5 bg-white/40 flex items-center gap-3 shadow-2xl">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {activeTab === "system" && (
          <SystemPanel 
            stats={stats} 
            services={services} 
            isLoading={systemLoading} 
          />
        )}
        {activeTab === "security" && (
          <SecurityPanel
            providers={providers}
            onToggleProvider={toggleProvider}
            onUpdateKey={updateProviderKey}
            onAddProvider={addProvider}
            onRemoveProvider={removeProvider}
          />
        )}
        {activeTab === "models" && (
          <ModelsPanel 
            activeProviders={providers
              .filter(p => p.active && p.key && p.key.trim() !== "")
              .map(p => p.id.toLowerCase())} 
          />
        )}
        {activeTab === "users" && (
          <UsersPanel
            users={users}
            isLoading={usersLoading}
            onUpdateRole={updateUserRole}
            onDelete={deleteUser}
          />
        )}
      </div>
    </div>
  );
}
