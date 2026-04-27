export type SubscriberStatus = "active" | "cancelled";
export type VehicleType = "OTOMOBIL" | "MOTOR";

export interface Subscriber {
  id: string;
  full_name: string;
  phone: string | null;
  plate_number: string;
  vehicle_type: VehicleType;
  payment_day: number;
  last_paid_at: string | null;
  status: SubscriberStatus;
  created_at: string;
}
