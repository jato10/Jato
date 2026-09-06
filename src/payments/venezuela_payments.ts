import crypto from 'crypto';
import { PaymentMethodType } from '../types/models';

type PaymentProviderMode = 'mock' | 'live';

const PAYMENT_PROVIDER: PaymentProviderMode = (process.env.PAYMENT_PROVIDER as PaymentProviderMode) || 'mock';

if (PAYMENT_PROVIDER === 'live') {
  throw new Error(
    'PAYMENT_PROVIDER=live fue solicitado pero VenezuelaPaymentProcessor solo tiene una implementación mock. ' +
    'Conecta un proveedor real (banco, Binance, procesador de tarjetas) antes de habilitar este modo.'
  );
}

export interface BCVRateInfo {
  ratePerUSD: number;
  lastUpdated: Date;
  source: string;
}

export interface PagoMovilC2PRequest {
  bankCode: string;
  phoneNumber: string;
  nationalId: string;
  c2pToken: string;
  amountVES: number;
  idempotencyKey?: string;
}

export interface PagoMovilC2PResponse {
  success: boolean;
  transactionId: string;
  bankReference: string;
  message: string;
  idempotent?: boolean;
}

export interface BinancePayRequest {
  orderId: string;
  amountUSDT: number;
  userBinanceId?: string;
  idempotencyKey?: string;
}

export interface ZelleValidationRequest {
  senderName: string;
  referenceNumber: string;
  amountUSD: number;
}

export interface CardPaymentRequest {
  rideId: string;
  amount: number;
  currency: 'USD' | 'VES';
  paymentMethod: Extract<PaymentMethodType, 'CREDIT_CARD' | 'DEBIT_CARD' | 'APPLE_PAY' | 'GOOGLE_PAY'>;
  paymentToken: string;
  isInternational: boolean;
  idempotencyKey?: string;
}

export interface CardPaymentResponse {
  transactionId: string;
  status: 'APPROVED' | 'DECLINED' | 'PENDING';
  receiptUrl: string;
  timestamp: Date;
  idempotent?: boolean;
}

export interface DriverSubscriptionPaymentRequest {
  driverId: string;
  vehicleType: 'MOTO' | 'AUTO';
  paymentMethod: PaymentMethodType;
  bankCode?: string;
  phoneNumber?: string;
  c2pToken?: string;
  idempotencyKey?: string;
}

export interface DriverSubscriptionPaymentResponse {
  transactionId: string;
  status: 'APPROVED';
  amountUSDCharged: number;
  amountVESCharged: number;
  newSubscriptionExpiry: Date;
  idempotent?: boolean;
}

class IdempotencyStore {
  private store = new Map<string, unknown>();

  public get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  public set(key: string, value: unknown): void {
    this.store.set(key, value);
  }
}

export class VenezuelaPaymentProcessor {
  private currentBCVRate: number = 68.45; // Default fallback rate
  private idempotencyStore = new IdempotencyStore();

  /**
   * Sets or updates the official BCV rate (VES per USD)
   */
  public updateBCVRate(newRate: number): BCVRateInfo {
    if (newRate <= 0) {
      throw new Error('Tasa BCV inválida');
    }
    this.currentBCVRate = newRate;
    return {
      ratePerUSD: this.currentBCVRate,
      lastUpdated: new Date(),
      source: 'BCV_OFFICIAL_API'
    };
  }

  /**
   * Returns current active BCV rate
   */
  public getBCVRate(): number {
    return this.currentBCVRate;
  }

  /**
   * Converts USD amount to VES using official BCV rate
   */
  public convertUSDToVES(amountUSD: number): number {
    return Number((amountUSD * this.currentBCVRate).toFixed(2));
  }

  /**
   * Processes Pago Móvil C2P (Cobro a Personas).
   */
  public processPagoMovilC2P(req: PagoMovilC2PRequest): PagoMovilC2PResponse {
    if (req.idempotencyKey) {
      const cached = this.idempotencyStore.get<PagoMovilC2PResponse>(req.idempotencyKey);
      if (cached) {
        return { ...cached, idempotent: true };
      }
    }

    if (!req.bankCode || req.bankCode.length !== 4) {
      return { success: false, transactionId: '', bankReference: '', message: 'Código bancario inválido' };
    }
    if (!req.c2pToken || req.c2pToken.length < 4) {
      return { success: false, transactionId: '', bankReference: '', message: 'Token C2P no provisto o inválido' };
    }
    if (req.amountVES <= 0) {
      return { success: false, transactionId: '', bankReference: '', message: 'Monto a debitar debe ser mayor a 0' };
    }

    const txId = `tx_pm_${crypto.randomUUID()}`;
    const bankRef = crypto.randomInt(100000000000, 999999999999).toString();

    const response: PagoMovilC2PResponse = {
      success: true,
      transactionId: txId,
      bankReference: bankRef,
      message: 'Pago Móvil C2P debitado exitosamente'
    };

    if (req.idempotencyKey) {
      this.idempotencyStore.set(req.idempotencyKey, response);
    }
    return response;
  }

  /**
   * Processes card and digital wallet (Apple Pay, Google Pay) payments.
   */
  public processCardPayment(req: CardPaymentRequest): CardPaymentResponse {
    if (req.idempotencyKey) {
      const cached = this.idempotencyStore.get<CardPaymentResponse>(req.idempotencyKey);
      if (cached) {
        return { ...cached, idempotent: true };
      }
    }

    if (req.amount <= 0) {
      throw new Error('Monto de pago con tarjeta debe ser mayor a 0');
    }
    if (!req.paymentToken || req.paymentToken.trim() === '') {
      throw new Error('Token de pago no provisto');
    }

    const txId = `tx_card_${crypto.randomUUID()}`;
    const response: CardPaymentResponse = {
      transactionId: txId,
      status: 'APPROVED',
      receiptUrl: `https://jato.app/receipts/${txId.replace('tx_card_', '')}`,
      timestamp: new Date()
    };

    if (req.idempotencyKey) {
      this.idempotencyStore.set(req.idempotencyKey, response);
    }
    return response;
  }

  /**
   * Processes flat monthly driver subscription payment ($35 for MOTO, $45 for AUTO).
   */
  public processDriverSubscriptionPayment(req: DriverSubscriptionPaymentRequest): DriverSubscriptionPaymentResponse {
    if (req.idempotencyKey) {
      const cached = this.idempotencyStore.get<DriverSubscriptionPaymentResponse>(req.idempotencyKey);
      if (cached) {
        return { ...cached, idempotent: true };
      }
    }

    const amountUSDCharged = req.vehicleType === 'MOTO' ? 35.0 : 45.0;
    const amountVESCharged = this.convertUSDToVES(amountUSDCharged);

    const newSubscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const txId = `tx_sub_${crypto.randomUUID()}`;

    const response: DriverSubscriptionPaymentResponse = {
      transactionId: txId,
      status: 'APPROVED',
      amountUSDCharged,
      amountVESCharged,
      newSubscriptionExpiry
    };

    if (req.idempotencyKey) {
      this.idempotencyStore.set(req.idempotencyKey, response);
    }
    return response;
  }

  /**
   * Verifies Binance Pay transaction in USDT.
   */
  public createBinancePayOrder(req: BinancePayRequest): { success: boolean; qrCodeUrl: string; orderRef: string; idempotent?: boolean } {
    if (req.idempotencyKey) {
      const cached = this.idempotencyStore.get<{ success: boolean; qrCodeUrl: string; orderRef: string }>(req.idempotencyKey);
      if (cached) {
        return { ...cached, idempotent: true };
      }
    }

    if (req.amountUSDT <= 0) {
      throw new Error('Monto USDT inválido');
    }
    const orderRef = `binance_${req.orderId}_${crypto.randomUUID()}`;
    const response = {
      success: true,
      qrCodeUrl: `https://pay.binance.com/qr/${orderRef}`,
      orderRef
    };

    if (req.idempotencyKey) {
      this.idempotencyStore.set(req.idempotencyKey, response);
    }
    return response;
  }

  /**
   * Validates Zelle transfer reference.
   */
  public validateZelleReference(req: ZelleValidationRequest): { verified: boolean; confidenceScore: number } {
    if (!req.referenceNumber || req.referenceNumber.length < 6) {
      return { verified: false, confidenceScore: 0 };
    }
    return {
      verified: true,
      confidenceScore: 0.99
    };
  }

  /**
   * Calculates cash change (Vuelto) and auto-credits remainder to Jato Wallet.
   */
  public calculateCashChange(fareUSD: number, paidUSD: number): { changeUSD: number; creditedToWalletUSD: number } {
    if (paidUSD < fareUSD) {
      throw new Error('Monto pagado es inferior a la tarifa');
    }
    const fareCents = Math.round(fareUSD * 100);
    const paidCents = Math.round(paidUSD * 100);
    const changeCents = paidCents - fareCents;
    const changeUSD = Number((changeCents / 100).toFixed(2));

    return {
      changeUSD,
      creditedToWalletUSD: changeUSD
    };
  }
}
