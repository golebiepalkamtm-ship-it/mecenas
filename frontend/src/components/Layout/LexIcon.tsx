import React from "react";
import { cn } from "../../utils/cn";
import {
  ChatIcon,
  DrafterIcon,
  JudgmentsIcon,
  DocumentsIcon,
  PromptsIcon,
  KnowledgeIcon,
  ProfilIcon,
  AdminIcon,
  realisticIconMap,
} from "./RealisticIcons";
import { createElement } from "react";
import type { Tab } from "../../types/navigation";

type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

export type LexIconName =
  | "chat"
  | "history"
  | "messages"
  | "drafter"
  | "draft"
  | "judgments"
  | "gavel"
  | "scale"
  | "documents"
  | "file"
  | "library"
  | "prompts"
  | "brain"
  | "ai"
  | "knowledge"
  | "database"
  | "layers"
  | "book"
  | "settings"
  | "profil"
  | "user"
  | "admin"
  | "shield";

const lexIconMap: Record<LexIconName, IconComponent> = {
  chat: ChatIcon,
  history: ChatIcon,
  messages: ChatIcon,
  drafter: DrafterIcon,
  draft: DrafterIcon,
  judgments: JudgmentsIcon,
  gavel: JudgmentsIcon,
  scale: JudgmentsIcon,
  documents: DocumentsIcon,
  file: DocumentsIcon,
  library: DocumentsIcon,
  prompts: PromptsIcon,
  brain: PromptsIcon,
  ai: PromptsIcon,
  knowledge: KnowledgeIcon,
  database: KnowledgeIcon,
  layers: KnowledgeIcon,
  book: KnowledgeIcon,
  settings: ProfilIcon,
  profil: ProfilIcon,
  user: ProfilIcon,
  admin: AdminIcon,
  shield: AdminIcon,
};

export interface LexIconProps {
  name: LexIconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Ikona wektorowa SVG w stylu nawigacji. */
export function LexIcon({ name, size, className, style }: LexIconProps) {
  const Component = lexIconMap[name] ?? ChatIcon;
  const dimensionStyle: React.CSSProperties = size
    ? { width: size, height: size, ...style }
    : style ?? {};

  return (
    <Component
      className={cn(size ? undefined : "w-4 h-4", className)}
      style={dimensionStyle}
    />
  );
}

export function lexIconForTab(tab: Tab): IconComponent {
  return realisticIconMap[tab] ?? ChatIcon;
}

export function LexIconForTab({
  tab,
  size,
  className,
  ...props
}: { tab: Tab; size?: number; className?: string } & Omit<LexIconProps, "name">) {
  const dimensionStyle: React.CSSProperties = size ? { width: size, height: size } : {};

  return createElement(lexIconForTab(tab), {
    className: cn(size ? undefined : "w-4 h-4", className),
    style: dimensionStyle,
    ...props,
  });
}
