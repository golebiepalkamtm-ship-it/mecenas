export type Tab =
  | "chat"
  | "consilium"
  | "knowledge"
  | "prompts"
  | "drafter"
  | "documents"
  | "admin"
  | "settings";

export interface NavItem {
  id: Tab;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: string;
  colorRgb: string;
  adminOnly?: boolean;
}
