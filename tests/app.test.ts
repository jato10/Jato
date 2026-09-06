import { SecurityService } from '../src/security/auth';
import { VenezuelaPaymentProcessor } from '../src/payments/venezuela_payments';
import { RideAndDeliveryEngine, AvailableDriver, RideRequest } from '../src/services/ride_delivery_engine';

describe('Jato SuperApp Core System Tests', () => {
  let paymentProcessor: VenezuelaPaymentProcessor;
  let rideEngine: RideAndDeliveryEngine;

  beforeEach(() => {
    paymentProcessor = new VenezuelaPaymentProcessor();
    rideEngine = new RideAndDeliveryEngine(paymentProcessor);
  });

  describe('Security & Anti-Fraud Service', () => {
    test('HMAC payload signature generation and verification', () => {
      const payload = JSON.stringify({ userId: 'usr_100', amountVES: 350.0 });
      const secret = 'super_secret_key';
      const signature = SecurityService.generateSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(SecurityService.verifySignature(payload, signature, secret)).toBe(true);
    });

    test('AES-256-GCM encryption and decryption of sensitive national ID (with per-record salt)', () => {
      const secretKey = 'my_secure_encryption_key';
      const nationalId = 'V-19876543';

      const encrypted = SecurityService.encryptAES256(nationalId, secretKey);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.salt).toBeDefined();

      const decrypted = SecurityService.decryptAES256(encrypted, secretKey);
      expect(decrypted).toBe(nationalId);
    });

    test('Two encryptions of the same plaintext use different salts and ciphertexts', () => {
      const secretKey = 'my_secure_encryption_key';
      const nationalId = 'V-19876543';

      const encryptedA = SecurityService.encryptAES256(nationalId, secretKey);
      const encryptedB = SecurityService.encryptAES256(nationalId, secretKey);

      expect(encryptedA.salt).not.toBe(encryptedB.salt);
      expect(encryptedA.ciphertext).not.toBe(encryptedB.ciphertext);
    });

    test('Anti-GPS Spoofing & Telemetry validation', () => {
      const mockTelemetry = {
        lat: 10.4806,
        lng: -66.9036,
        speedKmh: 45.0,
        isMockGps: true,
        cellTowerHash: 'cell_tower_99'
      };

      const result = SecurityService.validateDriverTelemetry(mockTelemetry);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('MOCK_GPS_DETECTED');
    });

    test('JWT session token generation and verification', () => {
      const token = SecurityService.generateToken('usr_123', 'DRIVER');
      expect(token).toBeDefined();

      const decoded = SecurityService.verifyToken(token);
      expect(decoded.userId).toBe('usr_123');
      expect(decoded.role).toBe('DRIVER');
    });

    test('Secure PIN generation produces the requested number of digits', () => {
      const pin = SecurityService.generateSecurePin(4);
      expect(pin.length).toBe(4);
      expect(Number.isNaN(Number(pin))).toBe(false);
    });
  });

  describe('Venezuelan Payment Processor', () => {
    test('BCV exchange rate updates and USD to VES conversion', () => {
      paymentProcessor.updateBCVRate(70.0);
      expect(paymentProcessor.getBCVRate()).toBe(70.0);

      const vesAmount = paymentProcessor.convertUSDToVES(10.0);
      expect(vesAmount).toBe(700.0);
    });

    test('Pago Móvil C2P processing', () => {
      const res = paymentProcessor.processPagoMovilC2P({
        bankCode: '0105',
        phoneNumber: '04141234567',
        nationalId: 'V19876543',
        c2pToken: '998123',
        amountVES: 350.0,
        idempotencyKey: 'idem_pm_001'
      });

      expect(res.success).toBe(true);
      expect(res.transactionId).toContain('tx_pm_');
      expect(res.bankReference).toBeDefined();
    });

    test('Pago Móvil C2P is idempotent under retry with the same key', () => {
      const req = {
        bankCode: '0105',
        phoneNumber: '04141234567',
        nationalId: 'V19876543',
        c2pToken: '998123',
        amountVES: 350.0,
        idempotencyKey: 'idem_pm_retry_001'
      };

      const first = paymentProcessor.processPagoMovilC2P(req);
      const retry = paymentProcessor.processPagoMovilC2P(req);

      expect(retry.transactionId).toBe(first.transactionId);
      expect(retry.idempotent).toBe(true);
    });

    test('Driver flat monthly subscription payment processing ($35 MOTO, $45 AUTO)', () => {
      paymentProcessor.updateBCVRate(68.45);
      const res = paymentProcessor.processDriverSubscriptionPayment({
        driverId: 'drv_5512',
        vehicleType: 'MOTO',
        paymentMethod: 'PAGO_MOVIL_C2P',
        bankCode: '0105',
        phoneNumber: '04141234567',
        c2pToken: '891234',
        idempotencyKey: 'idem_sub_001'
      });

      expect(res.status).toBe('APPROVED');
      expect(res.transactionId).toContain('tx_sub_');
      expect(res.amountUSDCharged).toBe(35.0);
      expect(res.amountVESCharged).toBe(Number((35.0 * 68.45).toFixed(2)));
      expect(res.newSubscriptionExpiry).toBeDefined();
    });

    test('Card and digital wallet payment processing (Credit, Debit, Apple Pay, Google Pay)', () => {
      const res = paymentProcessor.processCardPayment({
        rideId: 'ride_7712a',
        amount: 4.5,
        currency: 'USD',
        paymentMethod: 'CREDIT_CARD',
        paymentToken: 'tok_1N3cTestToken',
        isInternational: true,
        idempotencyKey: 'idem_card_001'
      });

      expect(res.status).toBe('APPROVED');
      expect(res.transactionId).toContain('tx_card_');
      expect(res.receiptUrl).toContain('https://jato.app/receipts/');
    });

    test('Binance Pay order creation in USDT', () => {
      const res = paymentProcessor.createBinancePayOrder({
        orderId: 'ord_7712',
        amountUSDT: 5.5,
        idempotencyKey: 'idem_binance_001'
      });

      expect(res.success).toBe(true);
      expect(res.qrCodeUrl).toContain('pay.binance.com');
    });

    test('Cash change calculation and wallet credit remainder', () => {
      const result = paymentProcessor.calculateCashChange(7.5, 10.0);
      expect(result.changeUSD).toBe(2.5);
      expect(result.creditedToWalletUSD).toBe(2.5);
    });
  });

  describe('Ride & Delivery Engine', () => {
    test('Fare estimation with conditional $0.35 USD tech fee (Applied on electronic payment, waived on cash)', () => {
      const origin = { lat: 10.4806, lng: -66.9036 };
      const destination = { lat: 10.4910, lng: -66.8520 };

      // Electronic payment (Pago Móvil C2P) -> includes $0.35 tech fee
      const electronicFare = rideEngine.estimateFare(origin, destination, 'EXPRESS', 'PAGO_MOVIL_C2P');
      expect(electronicFare.techFeeUSD).toBe(0.35);

      // Cash payment (CASH_USD) -> waives $0.35 tech fee
      const cashFare = rideEngine.estimateFare(origin, destination, 'EXPRESS', 'CASH_USD');
      expect(cashFare.techFeeUSD).toBe(0.0);
      expect(electronicFare.fareUSD).toBe(Number((cashFare.fareUSD + 0.35).toFixed(2)));
    });

    test('Finding optimal verified driver nearby with valid INTT and IPOSTEL legal permits', () => {
      const origin = { lat: 10.4806, lng: -66.9036 };
      const futureDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
      const expiredDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      const drivers: AvailableDriver[] = [
        {
          driverId: 'drv_1',
          name: 'Pedro',
          serviceType: 'DELIVERY',
          lat: 10.4810,
          lng: -66.9030,
          rating: 4.9,
          isOnline: true,
          kycVerified: true,
          backgroundCheckExpiryDate: futureDate,
          inttPermitExpiryDate: futureDate,
          ipostelLicenseExpiryDate: futureDate,
          subscriptionExpiryDate: futureDate
        },
        {
          driverId: 'drv_2',
          name: 'Jose',
          serviceType: 'DELIVERY',
          lat: 10.4807,
          lng: -66.9035,
          rating: 5.0,
          isOnline: true,
          kycVerified: true,
          backgroundCheckExpiryDate: futureDate,
          inttPermitExpiryDate: futureDate,
          ipostelLicenseExpiryDate: expiredDate // Expired IPOSTEL license for delivery
        }
      ];

      const optimalDriver = rideEngine.findOptimalDriver(origin, 'DELIVERY', drivers);
      expect(optimalDriver).not.toBeNull();
      expect(optimalDriver?.driverId).toBe('drv_1');
    });

    test('Creation of ride session with cryptographically secure 4-digit PIN', () => {
      const req: RideRequest = {
        riderId: 'usr_88',
        origin: { lat: 10.4806, lng: -66.9036 },
        destination: { lat: 10.4910, lng: -66.8520 },
        serviceType: 'EXPRESS',
        paymentMethod: 'PAGO_MOVIL_C2P'
      };

      const driver: AvailableDriver = {
        driverId: 'drv_1',
        name: 'Pedro',
        serviceType: 'EXPRESS',
        lat: 10.4810,
        lng: -66.9030,
        rating: 4.9,
        isOnline: true,
        kycVerified: true
      };

      const trip = rideEngine.createTrip(req, driver);
      expect(trip.rideId).toBeDefined();
      expect(trip.boardingPin.length).toBe(4);
      expect(trip.status).toBe('ACCEPTED');
      expect(trip.techFeeUSD).toBe(0.35);
    });

    test('Triggering Jato Shield SOS alert persists the trigger reason and coordinates', () => {
      const trip = {
        rideId: 'ride_9912',
        riderId: 'usr_88',
        driverId: 'drv_1',
        boardingPin: '1234',
        serviceType: 'EXPRESS' as const,
        origin: { lat: 10.4806, lng: -66.9036 },
        destination: { lat: 10.4910, lng: -66.8520 },
        status: 'IN_PROGRESS' as const,
        techFeeUSD: 0.35,
        fareUSD: 5.0,
        fareVES: 342.25,
        paymentMethod: 'PAGO_MOVIL_C2P' as const,
        isDelivery: false,
        createdAt: new Date()
      };

      const sosRes = rideEngine.triggerSOSAlert(trip, 10.4850, -66.8950, 'ROUTE_DEVIATION');
      expect(sosRes.alertId).toContain('sos_ride_9912');
      expect(sosRes.notifiedSecurityCenter).toBe(true);
      expect(sosRes.reason).toBe('ROUTE_DEVIATION');
      expect(sosRes.lat).toBe(10.4850);
      expect(sosRes.lng).toBe(-66.8950);
    });
  });
});
