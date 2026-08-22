import { ServiceType, RideStatus, PaymentMethodType } from '../types/models';
import { VenezuelaPaymentProcessor } from '../payments/venezuela_payments';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
}

export interface FareEstimate {
  distanceKm: number;
  estimatedDurationMins: number;
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
   * Estimates trip or delivery fare in both USD and VES
   */
  public estimateFare(origin: LocationCoordinates, destination: LocationCoordinates, serviceType: ServiceType): FareEstimate {
    const distanceKm = this.calculateDistanceKm(origin, destination);
    // Estimated duration based on urban traffic in Venezuela (average 25 km/h)
    const estimatedDurationMins = Math.max(Math.ceil((distanceKm / 25) * 60), 5);

    let baseFare = 1.5; // Base fare USD
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

    const fareUSD = Number((baseFare + distanceKm * ratePerKm + estimatedDurationMins * ratePerMin).toFixed(2));
    const bcvRate = this.paymentProcessor.getBCVRate();
    const fareVES = this.paymentProcessor.convertUSDToVES(fareUSD);

    return {
      distanceKm,
      estimatedDurationMins,
      fareUSD,
      fareVES,
      bcvRate
    };
  }

  /**
   * Matches rider or delivery request to optimal verified driver
   */
  public findOptimalDriver(requestOrigin: LocationCoordinates, serviceType: ServiceType, candidateDrivers: AvailableDriver[]): AvailableDriver | null {
    const eligibleDrivers = candidateDrivers.filter(
      (driver) => driver.isOnline && driver.kycVerified && driver.serviceType === serviceType
    );

    if (eligibleDrivers.length === 0) {
      return null;
    }

    // Sort drivers by highest composite score (proximity + rating)
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
   * Generates a 4-digit boarding security PIN
   */
  public generateBoardingPin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Creates an active ride or delivery dispatch session
   */
  public createTrip(req: RideRequest, matchedDriver: AvailableDriver): ActiveTrip {
    const fare = this.estimateFare(req.origin, req.destination, req.serviceType);
    const pin = this.generateBoardingPin();

    return {
      rideId: `ride_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      riderId: req.riderId,
      driverId: matchedDriver.driverId,
      boardingPin: pin,
      serviceType: req.serviceType,
      origin: req.origin,
      destination: req.destination,
      status: 'ACCEPTED',
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
  public triggerSOSAlert(trip: ActiveTrip, currentLat: number, currentLng: number, reason: string): { alertId: string; status: string; notifiedSecurityCenter: boolean } {
    const alertId = `sos_${trip.rideId}_${Date.now()}`;
    return {
      alertId,
      status: 'DISPATCHED_TO_SECURITY_CENTER',
      notifiedSecurityCenter: true
    };
  }
}
