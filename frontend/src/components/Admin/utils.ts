export { getBrand } from "../Chat/constants";

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("pl-PL").format(value);

export const formatDate = (raw: string): string => {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "Brak daty";
  return parsed.toLocaleDateString("pl-PL");
};
