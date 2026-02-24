export interface ImportedMenuData {
  restaurant_name: string | null;
  categories: ImportedCategory[];
  currency_detected: string;
  language_detected: string;
  extraction_confidence: 'high' | 'medium' | 'low';
}

export interface ImportedCategory {
  id: string;
  name: string;
  description: string | null;
  position: number;
  items: ImportedItem[];
}

export interface ImportedItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  available: boolean;
  allergens: string[];
  tags: string[];
  position: number;
}

export interface MenuAnalysisResponse {
  success: boolean;
  extraction_id: string;
  extracted_at: string;
  menu_data: ImportedMenuData;
  stats: {
    total_categories: number;
    total_items: number;
    confidence: string;
  };
}
