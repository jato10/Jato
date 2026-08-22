# Esquemas y Modelos de Datos: Jato SuperApp

## 1. Diagrama de Relación de Entidades (ERD Logical Schema)

```text
  ┌─────────────────┐       1:N       ┌───────────────────┐
  │      User       ├────────────────►│ PaymentTransaction│
  └────────┬────────┘                 └───────────────────┘
           │ 1:1 (optional)                     │
           ▼                                    │
  ┌─────────────────┐                           │
  │     Driver      │                           │
  └────────┬────────┘                           │
           │ 1:N                                │
           ▼                                    ▼
  ┌─────────────────┐       1:N       ┌───────────────────┐
  │     Vehicle     ├────────────────►│   Ride / Delivery │
  └─────────────────┘                 └─────────┬─────────┘
                                                │ 1:N
                                                ▼
                                      ┌───────────────────┐
                                      │    PanicEvent     │
                                      └───────────────────┘
```

---

## 2. Definiciones TypeScript de Entidades Principales

```typescript
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
  phoneNumber: string; // Formato E.164 (+58...)
  email: string;
  nationalId: string; // Formato V-12345678 o E-12345678
  role: UserRole;
  kycStatus: KYCStatus;
  biometricHash?: string;
  walletBalanceUSD: number;
  walletBalanceVES: number;
  rating: number; // 1.00 - 5.00
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: Date;
  backgroundCheckIssueDate: Date; // Fecha de emisión de antecedentes (MPPRIJP)
  backgroundCheckExpiryDate: Date; // +365 días desde la emisión
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiryDate: Date; // Fecha límite del mes pagado ($35 motos, $45 autos)
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
  licensePlate: string; // Chapa venezolana
  serviceType: ServiceType;
  insurancePolicyNumber: string;
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
  boardingPin: string; // PIN de 4 dígitos para abordar
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
```
