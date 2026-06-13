export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
export type ItemType = 'STOCK' | 'SERVICE';
export type InvoiceStatus =
  | 'DRAFT'
  | 'FINALIZED'
  | 'PARTIAL'
  | 'PAID'
  | 'VOID';

export interface Party {
  id: string;
  type: PartyType;
  name: string;
  email?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  taxId?: string | null;
  notes?: string | null;
  archived: boolean;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  unit: string;
  defaultSalePrice: string; // Decimal serialized as string
  defaultTaxRate: string;
  trackInventory: boolean;
  archived: boolean;
}
