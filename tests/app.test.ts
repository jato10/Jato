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

    test('AES-256-GCM encryption and decryption of sensitive national ID', () => {
      const secretKey = 'my_secure_encryption_key';
      const nationalId = 'V-19876543';

      const encrypted = SecurityService.encryptAES256(nationalId, secretKey);
      expect(encrypted.ciphertext).toBeDefined();

      const decrypted = SecurityService.decryptAES256(encrypted, secretKey);
      expect(decrypted).toBe(nationalId);
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
        amountVES: 350.0
      });

      expect(res.success).toBe(true);
      expect(res.transactionId).toContain('tx_pm_');
      expect(res.bankReference).toBeDefined();
    });

    test('Binance Pay order creation in USDT', () => {
      const res = paymentProcessor.createBinancePayOrder({
        orderId: 'ord_7712',
        amountUSDT: 5.5
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
    test('Fare estimation in USD and VES', () => {
      const origin = { lat: 10.4806, lng: -66.9036 }; // Plaza Venezuela
      const destination = { lat: 10.4910, lng: -66.8520 }; // Altamira

      const fare = rideEngine.estimateFare(origin, destination, 'EXPRESS');
      expect(fare.distanceKm).toBeGreaterThan(0);
      expect(fare.fareUSD).toBeGreaterThan(0);
      expect(fare.fareVES).toBe(Number((fare.fareUSD * fare.bcvRate).toFixed(2)));
    });

    test('Finding optimal verified driver nearby', () => {
      const origin = { lat: 10.4806, lng: -66.9036 };
      const drivers: AvailableDriver[] = [
        {
          driverId: 'drv_1',
          name: 'Pedro',
          serviceType: 'EXPRESS',
          lat: 10.4810,
          lng: -66.9030,
          rating: 4.9,
          isOnline: true,
          kycVerified: true
        },
        {
          driverId: 'drv_2',
          name: 'Jose',
          serviceType: 'EXPRESS',
          lat: 10.4820,
          lng: -66.9020,
          rating: 4.5,
          isOnline: true,
          kycVerified: false // Not verified
        }
      ];

      const optimalDriver = rideEngine.findOptimalDriver(origin, 'EXPRESS', drivers);
      expect(optimalDriver).not.toBeNull();
      expect(optimalDriver?.driverId).toBe('drv_1');
    });

    test('Creation of ride session with 4-digit security PIN', () => {
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
    });

    test('Triggering Jato Shield SOS alert', () => {
      const trip = {
        rideId: 'ride_9912',
        riderId: 'usr_88',
        driverId: 'drv_1',
        boardingPin: '1234',
        serviceType: 'EXPRESS' as const,
        origin: { lat: 10.4806, lng: -66.9036 },
        destination: { lat: 10.4910, lng: -66.8520 },
        status: 'IN_PROGRESS' as const,
        fareUSD: 5.0,
        fareVES: 342.25,
        paymentMethod: 'PAGO_MOVIL_C2P' as const,
        isDelivery: false,
        createdAt: new Date()
      };

      const sosRes = rideEngine.triggerSOSAlert(trip, 10.4850, -66.8950, 'ROUTE_DEVIATION');
      expect(sosRes.alertId).toContain('sos_ride_9912');
      expect(sosRes.notifiedSecurityCenter).toBe(true);
    });
  });
});
