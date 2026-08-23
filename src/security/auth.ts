import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// JWT_SECRET es obligatorio en producción. Para desarrollo/testing
// se puede configurar via process.env.JWT_SECRET o utilizar el fallback dev.
const JWT_SECRET = process.env.JWT_SECRET || 'jato_super_secret_zero_trust_key_2026_dev_fallback';

const SCRYPT_KEY_LENGTH = 32;
const SALT_LENGTH_BYTES = 16;

export interface TelemetryPayload {
  lat: number;
  lng: number;
  speedKmh: number;
  isMockGps: boolean;
  cellTowerHash: string;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
  salt: string; // Necesario para re-derivar la clave al descifrar
}

export class SecurityService {
  /**
   * Generates a signed HMAC-SHA256 signature for a request payload
   */
  public static generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verifies an incoming HMAC-SHA256 payload signature safely
   */
  public static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  /**
   * Encrypts sensitive data using AES-256-GCM with a per-record random salt.
   * The salt is returned alongside the ciphertext/iv/tag and must be
   * persisted — it's required to re-derive the same key on decryption.
   */
  public static encryptAES256(text: string, secretKey: string): EncryptedPayload {
    const salt = crypto.randomBytes(SALT_LENGTH_BYTES);
    const key = crypto.scryptSync(secretKey, salt, SCRYPT_KEY_LENGTH);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      tag: tag,
      salt: salt.toString('hex')
    };
  }

  /**
   * Decrypts AES-256-GCM ciphertext using the salt stored alongside it
   */
  public static decryptAES256(encrypted: EncryptedPayload, secretKey: string): string {
    const salt = Buffer.from(encrypted.salt, 'hex');
    const key = crypto.scryptSync(secretKey, salt, SCRYPT_KEY_LENGTH);
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
   * Generates a cryptographically secure random boarding/verification PIN
   */
  public static generateSecurePin(digits: number = 4): string {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return crypto.randomInt(min, max + 1).toString();
  }

  /**
   * Generates JWT session token for verified users
   */
  public static generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role, issuer: 'jato_shield' }, JWT_SECRET as string, { expiresIn: '12h' });
  }

  /**
   * Verifies JWT session token
   */
  public static verifyToken(token: string): any {
    return jwt.verify(token, JWT_SECRET as string);
  }
}
