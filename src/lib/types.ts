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

export interface InvoiceLine {
  id?: string;
  itemId?: string | null;
  description: string;
  qty: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  lineTotal: string;
  position: number;
}

export interface Invoice {
  id: string;
  number: string | null;
  isOpeningBalance: boolean;
  status: InvoiceStatus;
  partyId: string;
  party?: { id: string; name: string };
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  invoiceDiscount: string;
  grandTotal: string;
  amountPaid: string;
  balance: string;
  finalizedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  lines: InvoiceLine[];
}
