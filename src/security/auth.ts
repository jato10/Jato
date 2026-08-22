import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jato_super_secret_zero_trust_key_2026';

export interface TelemetryPayload {
  lat: number;
  lng: number;
  speedKmh: number;
  isMockGps: boolean;
  cellTowerHash: string;
}

export class SecurityService {
  /**
   * Generates a signed HMAC-SHA256 signature for a request payload
   */
  public static generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verifies an incoming HMAC-SHA256 payload signature
   */
  public static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Encrypts sensitive data using AES-256-GCM
   */
  public static encryptAES256(text: string, secretKey: string): { ciphertext: string; iv: string; tag: string } {
    const key = crypto.scryptSync(secretKey, 'jato_salt', 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      tag: tag
    };
  }

  /**
   * Decrypts AES-256-GCM ciphertext
   */
  public static decryptAES256(encrypted: { ciphertext: string; iv: string; tag: string }, secretKey: string): string {
    const key = crypto.scryptSync(secretKey, 'jato_salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
    let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Validates hardware attestation and anti-GPS spoofing telemetry
   */
  public static validateDriverTelemetry(telemetry: TelemetryPayload): { isValid: boolean; reason?: string } {
    if (telemetry.isMockGps) {
      return { isValid: false, reason: 'MOCK_GPS_DETECTED' };
    }
    if (telemetry.speedKmh > 180) {
      return { isValid: false, reason: 'UNREALISTIC_SPEED_ANOMALY' };
    }
    if (!telemetry.cellTowerHash || telemetry.cellTowerHash.trim() === '') {
      return { isValid: false, reason: 'MISSING_CELL_TOWER_TRIANGULATION' };
    }
    return { isValid: true };
  }

  /**
   * Generates JWT session token for verified users
   */
  public static generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role, issuer: 'jato_shield' }, JWT_SECRET, { expiresIn: '12h' });
  }

  /**
   * Verifies JWT session token
   */
  public static verifyToken(token: string): any {
    return jwt.verify(token, JWT_SECRET);
  }
}
