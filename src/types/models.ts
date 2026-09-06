export type UserRole = 'RIDER' | 'DRIVER' | 'ADMIN' | 'DISPATCHER';
export type KYCStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type ServiceType = 'EXPRESS' | 'COMFORT' | 'MOTO' | 'DELIVERY' | 'CARGO';
export type PaymentMethodType = 'PAGO_MOVIL_C2P' | 'PAGO_MOVIL_P2P' | 'BINANCE_PAY' | 'ZELLE' | 'CASH_USD' | 'CASH_VES' | 'JATO_WALLET' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'APPLE_PAY' | 'GOOGLE_PAY';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type RideStatus = 'REQUESTED' | 'SEARCHING_DRIVER' | 'ACCEPTED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING_PAYMENT';

export interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  nationalId: string;
  role: UserRole;
  kycStatus: KYCStatus;
  biometricHash?: string;
  walletBalanceUSD: number;
  walletBalanceVES: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: Date;
  backgroundCheckIssueDate: Date;
  backgroundCheckExpiryDate: Date;

  // Marco Legal Venezolano
  inttPermitNumber: string; // Registro INTT Transporte Privado de Personas/Carga
  inttPermitExpiryDate: Date;
  ipostelLicenseNumber?: string; // Mención de operador postal / motorizado (IPOSTEL)
  ipostelLicenseExpiryDate?: Date;
  seniatRifNumber: string; // RIF Personal del Conductor (V-XXXXXXXX-X / E-XXXXXXXX-X)

  // Suscripción Mensual
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiryDate: Date;

  isOnline: boolean;
  currentLat?: number;
  currentLng?: number;
  lastRandomSelfieCheck: Date;
  activeVehicleId?: string;
  totalTripsCompleted: number;
  rating: number;
}

export interface Vehicle {
  id: string;
  driverId: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string; // Chapa nacional INTT
  serviceType: ServiceType;
  insurancePolicyNumber: string; // Póliza de RCV obligatoria
  insuranceExpiryDate: Date;
  isVerified: boolean;
}

export interface PaymentTransaction {
  id: string;
  rideId?: string;
  userId: string;
  method: PaymentMethodType;
  amountUSD: number;
  amountVES: number;
  bcvRateUsed: number;
  bankReference?: string;
  binanceOrderRef?: string;
  status: PaymentStatus;
  createdAt: Date;
}

export interface Ride {
  id: string;
  riderId: string;
  driverId?: string;
  vehicleId?: string;
  serviceType: ServiceType;
  status: RideStatus;
  originLat: number;
  originLng: number;
  originAddress: string;
  destLat: number;
  destLng: number;
  destAddress: string;
  boardingPin: string;
  techFeeUSD: number;
  fareUSD: number;
  fareVES: number;
  paymentMethod: PaymentMethodType;
  isDelivery: boolean;
  deliveryPackageNotes?: string;
  deliveryRecipientPhone?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface PanicEvent {
  id: string;
  rideId: string;
  triggeredByUserId: string;
  lat: number;
  lng: number;
  audioRecordingUrl?: string;
  resolved: boolean;
  resolvedAt?: Date;
  securityOperatorNotes?: string;
  createdAt: Date;
}
