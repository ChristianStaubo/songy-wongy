export interface XenditInvoicePaidData {
  id: string; // xendit invoice id
  external_id: string; // our booking _id
  user_id: string;
  status: string; // Can be 'PAID', 'PENDING', 'EXPIRED', etc.
  merchant_name: string;
  amount: number;
  paid_amount: number;
  bank_code?: string;
  paid_at: string;
  payer_email: string;
  description?: string;
  currency: string;
  payment_channel?: string;
  payment_method?: string;
}

export interface ProcessInvoicePaidJobData {
  xenditData: XenditInvoicePaidData;
  webhookTimestamp: string;
}

export interface GenerateMusicJobData {
  musicId: string; // Database record ID
  userId: string; // Clerk user ID
  name: string;
  prompt: string;
  lengthMs?: number;
  outputFormat?: string;
  modelId?: string;
}
