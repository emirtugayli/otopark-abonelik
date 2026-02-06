export type SubscriberStatus = "active" | "overdue" | "cancelled";

export interface Subscriber {
  id: string;
  full_name: string;
  phone: string;
  plate_number: string;
  start_date: string;
  end_date: string;
  monthly_fee: number;
  status: SubscriberStatus;
  created_at: string;
  pre_reminder_sent_at?: string | null;
  due_reminder_sent_at?: string | null;
  last_overdue_reminder_sent_at?: string | null;
}

export interface Payment {
  id: string;
  subscriber_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  created_at: string;
}
