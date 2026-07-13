export type Product = {
  id: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  price: number;
  previousPrice: number | null;
  updatedAt: number;
  sectionId?: string;
};

export type CustomSection = {
  id: string;
  title: string;
};

export type FooterTemplate = {
  line1: string;
  line2: string;
  line3: string;
};

export type AppSettings = {
  theme: 'dark' | 'light';
  currency: string;
  dateFormat: string;
  storeName: string;
  location: string;
  logo: string | null;
  favoriteBrands: string[];
  brandOrder: string[];
  header: { title: string; validity: string };
  footer: FooterTemplate;
  titleTemplates: string[];
  validityTemplates: string[];
  footerTemplates: FooterTemplate[];
  customSections: CustomSection[];
  sectionOrder: string[];
  collapsedSections: Record<string, boolean>;
  collapsedBrands: Record<string, boolean>;
  autosaveEnabled: boolean;
};

export type HeaderData = {
  storeName: string;
  location: string;
  date: string;
  title: string;
  validity: string;
};

export type Snapshot = {
  id: string;
  date: string;
  dateKey: string;
  savedAt: number;
  products: Product[];
  settings: AppSettings;
};

export type Contact = {
  id: string;
  name: string;
  phone: string;
  createdAt: number;
};

export type DisplayGroup = {
  key: string;
  title: string;
  products: Product[];
  isCustom: boolean;
  sectionId?: string;
  brand?: string;
  collapsed: boolean;
};

export type SharePayload = {
  text: string;
  label: string;
};
