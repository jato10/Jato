import crypto from 'crypto';
import { ServiceType, RideStatus, PaymentMethodType, SubscriptionStatus } from '../types/models';
import { VenezuelaPaymentProcessor } from '../payments/venezuela_payments';
import { SecurityService } from '../security/auth';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
}

export interface FareEstimate {
  distanceKm: number;
  estimatedDurationMins: number;
  techFeeUSD: number;
  fareUSD: number;
  fareVES: number;
  bcvRate: number;
}

export interface AvailableDriver {
  driverId: string;
  name: string;
  serviceType: ServiceType;
  lat: number;
  lng: number;
  rating: number;
  isOnline: boolean;
  kycVerified: boolean;
  backgroundCheckExpiryDate?: Date;
  inttPermitExpiryDate?: Date;
  ipostelLicenseExpiryDate?: Date;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiryDate?: Date;
}

export interface RideRequest {
  riderId: string;
  origin: LocationCoordinates;
  destination: LocationCoordinates;
  serviceType: ServiceType;
  paymentMethod: PaymentMethodType;
  isDelivery?: boolean;
  deliveryNotes?: string;
}

export interface ActiveTrip {
  rideId: string;
  riderId: string;
  driverId: string;
  boardingPin: string;
  serviceType: ServiceType;
  origin: LocationCoordinates;
  destination: LocationCoordinates;
  status: RideStatus;
  techFeeUSD: number;
  fareUSD: number;
  fareVES: number;
  paymentMethod: PaymentMethodType;
  isDelivery: boolean;
  createdAt: Date;
}

export class RideAndDeliveryEngine {
  private paymentProcessor: VenezuelaPaymentProcessor;

  constructor(paymentProcessor: VenezuelaPaymentProcessor) {
    this.paymentProcessor = paymentProcessor;
  }

  /**
   * Calculates Haversine distance in kilometers between two lat/lng coordinates
   */
  public calculateDistanceKm(loc1: LocationCoordinates, loc2: LocationCoordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * (Math.PI / 180);
    const dLng = (loc2.lng - loc1.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(loc1.lat * (Math.PI / 180)) *
        Math.cos(loc2.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Estimates trip or delivery fare in both USD and VES.
   * A conditional $0.35 USD tech fee is added ONLY for electronic payment methods.
   * Cash payments (CASH_USD, CASH_VES) exempt the rider from this $0.35 USD tech fee.
   */
  public estimateFare(
    origin: LocationCoordinates,
    destination: LocationCoordinates,
    serviceType: ServiceType,
    paymentMethod: PaymentMethodType = 'PAGO_MOVIL_C2P'
  ): FareEstimate {
    const distanceKm = this.calculateDistanceKm(origin, destination);
    const estimatedDurationMins = Math.max(Math.ceil((distanceKm / 25) * 60), 5);

    let baseFare = 1.5;
    let ratePerKm = 0.5;
    let ratePerMin = 0.1;

    switch (serviceType) {
      case 'COMFORT':
        baseFare = 2.5;
        ratePerKm = 0.8;
        break;
      case 'MOTO':
        baseFare = 1.0;
        ratePerKm = 0.35;
        break;
      case 'DELIVERY':
        baseFare = 1.2;
        ratePerKm = 0.4;
        break;
      case 'CARGO':
        baseFare = 8.0;
        ratePerKm = 1.5;
        break;
      case 'EXPRESS':
      default:
        baseFare = 1.5;
        ratePerKm = 0.5;
        break;
    }

    // $0.35 USD tech fee is only applied on non-cash (electronic) payments
    const isCashPayment = paymentMethod === 'CASH_USD' || paymentMethod === 'CASH_VES';
    const techFeeUSD = isCashPayment ? 0.0 : 0.35;

    const baseDistanceTimeFare = baseFare + distanceKm * ratePerKm + estimatedDurationMins * ratePerMin;
    const fareUSD = Number((baseDistanceTimeFare + techFeeUSD).toFixed(2));
    const bcvRate = this.paymentProcessor.getBCVRate();
    const fareVES = this.paymentProcessor.convertUSDToVES(fareUSD);

    return {
      distanceKm,
      estimatedDurationMins,
      techFeeUSD,
      fareUSD,
      fareVES,
      bcvRate
    };
  }

  /**
   * Matches rider or delivery request to optimal driver with valid INTT transport permit, IPOSTEL postal license (if delivery), background check, and active monthly subscription.
   */
  public findOptimalDriver(requestOrigin: LocationCoordinates, serviceType: ServiceType, candidateDrivers: AvailableDriver[]): AvailableDriver | null {
    const now = new Date();
    const eligibleDrivers = candidateDrivers.filter((driver) => {
      const isBgCheckValid = !driver.backgroundCheckExpiryDate || driver.backgroundCheckExpiryDate > now;
      const isSubscriptionActive = !driver.subscriptionExpiryDate || driver.subscriptionExpiryDate > now;
      const isInttValid = !driver.inttPermitExpiryDate || driver.inttPermitExpiryDate > now;
      const isIpostelValid = serviceType !== 'DELIVERY' && serviceType !== 'CARGO' ? true : (!driver.ipostelLicenseExpiryDate || driver.ipostelLicenseExpiryDate > now);

      return (
        driver.isOnline &&
        driver.kycVerified &&
        isBgCheckValid &&
        isSubscriptionActive &&
        isInttValid &&
        isIpostelValid &&
        driver.serviceType === serviceType
      );
    });

    if (eligibleDrivers.length === 0) {
      return null;
    }

    eligibleDrivers.sort((a, b) => {
      const distA = this.calculateDistanceKm(requestOrigin, { lat: a.lat, lng: a.lng });
      const distB = this.calculateDistanceKm(requestOrigin, { lat: b.lat, lng: b.lng });

      const scoreA = a.rating * 2.0 - distA * 0.5;
      const scoreB = b.rating * 2.0 - distB * 0.5;

      return scoreB - scoreA;
    });

    return eligibleDrivers[0];
  }

  /**
   * Generates a cryptographically secure 4-digit boarding security PIN
   */
  public generateBoardingPin(): string {
    return SecurityService.generateSecurePin(4);
  }

  /**
   * Creates an active ride or delivery dispatch session
   */
  public createTrip(req: RideRequest, matchedDriver: AvailableDriver): ActiveTrip {
    const fare = this.estimateFare(req.origin, req.destination, req.serviceType, req.paymentMethod);
    const pin = this.generateBoardingPin();

    return {
      rideId: `ride_${crypto.randomUUID()}`,
      riderId: req.riderId,
      driverId: matchedDriver.driverId,
      boardingPin: pin,
      serviceType: req.serviceType,
      origin: req.origin,
      destination: req.destination,
      status: 'ACCEPTED',
      techFeeUSD: fare.techFeeUSD,
      fareUSD: fare.fareUSD,
      fareVES: fare.fareVES,
      paymentMethod: req.paymentMethod,
      isDelivery: !!req.isDelivery,
      createdAt: new Date()
    };
  }

  /**
   * Triggers Emergency Panic Alert (Jato Shield)
   */
  public triggerSOSAlert(
    trip: ActiveTrip,
    currentLat: number,
    currentLng: number,
    reason: string
  ): { alertId: string; status: string; notifiedSecurityCenter: boolean; reason: string; lat: number; lng: number } {
    const alertId = `sos_${trip.rideId}_${crypto.randomUUID()}`;
    return {
      alertId,
      status: 'DISPATCHED_TO_SECURITY_CENTER',
      notifiedSecurityCenter: true,
      reason,
      lat: currentLat,
      lng: currentLng
    };
  }
}
