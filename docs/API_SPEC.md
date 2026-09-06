# Especificación de API REST y WebSocket: Jato SuperApp

**Versión:** 1.0.0
**Seguridad Base:** SSL Pinning obligatorio + Encabezado de Firma `X-Jato-Signature` (HMAC-SHA256) + Token Bearer JWT.

---

## 1. Autenticación y Verificación Biometria

### `POST /api/v1/auth/register-kyc`
Registra a un usuario o conductor requiriendo verificación biométrica facial y documento de identidad venezolano.

- **Headers:**
  - `Content-Type: application/json`
  - `X-Jato-Device-Token: <hardware_attestation_token>`
  - `X-Jato-Signature: <hmac_sha256>`
- **Body:**
```json
{
  "full_name": "Carlos Mendoza",
  "phone": "+584141234567",
  "email": "carlos@example.com",
  "national_id": "V-19876543",
  "role": "DRIVER", // "RIDER" | "DRIVER"
  "document_front_b64": "<base64_encoded_id>",
  "liveness_selfie_b64": "<base64_encoded_3d_liveness>"
}
```
- **Response (201 Created):**
```json
{
  "status": "SUCCESS",
  "user_id": "usr_99812a4b",
  "kyc_status": "VERIFIED",
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "refresh_token": "rt_887123aa..."
}
```

---

## 2. Pagos Venezolanos y Transacciones Multimoneda

### `POST /api/v1/payments/pago-movil/c2p`
Ejecuta un pago directo por Pago Móvil C2P debitando la cuenta bancaria del usuario mediante clave dinámica SMS.

- **Body:**
```json
{
  "ride_id": "ride_7712a",
  "bank_code": "0105", // Mercantil (por ejemplo)
  "phone_number": "04141234567",
  "national_id": "V19876543",
  "c2p_token": "891234",
  "amount_ves": 250.50
}
```
- **Response (200 OK):**
```json
{
  "transaction_id": "tx_pm_0091823",
  "status": "APPROVED",
  "bank_reference": "881273918237",
  "timestamp": "2026-03-30T14:22:10Z"
}
```

### `POST /api/v1/payments/binance-pay`
Genera una orden de pago Binance Pay en USDT.

- **Body:**
```json
{
  "ride_id": "ride_7712a",
  "amount_usdt": 5.50
}
```
- **Response (200 OK):**
```json
{
  "order_id": "binance_ord_5512",
  "payment_url": "https://pay.binance.com/qr/...",
  "qr_code_base64": "<base64_qr>",
  "expires_at": 1774880800
}
```

### `POST /api/v1/payments/card`
Procesa pagos con tarjetas de débito o crédito (nacionales e internacionales), así como billeteras digitales (Apple Pay, Google Pay) mediante tokenización.

- **Body:**
```json
{
  "ride_id": "ride_7712a",
  "amount": 4.50,
  "currency": "USD",
  "payment_method": "CREDIT_CARD", // "CREDIT_CARD" | "DEBIT_CARD" | "APPLE_PAY" | "GOOGLE_PAY"
  "payment_token": "tok_1N3c...", // Token generado por la pasarela
  "is_international": true
}
```
- **Response (200 OK):**
```json
{
  "transaction_id": "tx_card_99812",
  "status": "APPROVED",
  "receipt_url": "https://jato.app/receipts/99812",
  "timestamp": "2026-03-30T14:25:00Z"
}
```

### `POST /api/v1/drivers/subscription/pay`
Procesa el pago de la tarifa plana mensual del conductor. El monto es fijo en dólares ($35 para Motos, $45 para Autos) y se convierte a VES según la tasa del BCV al momento del pago.

- **Body:**
```json
{
  "driver_id": "drv_5512",
  "vehicle_type": "MOTO", // "MOTO" = $35 | "AUTO" = $45
  "payment_method": "PAGO_MOVIL_C2P",
  "bank_code": "0105",
  "phone_number": "04141234567",
  "c2p_token": "891234"
}
```
- **Response (200 OK):**
```json
{
  "transaction_id": "tx_sub_88123",
  "status": "APPROVED",
  "amount_usd_charged": 35.00,
  "amount_ves_charged": 2395.75, // Basado en tasa BCV
  "new_subscription_expiry": "2026-09-22T23:59:59Z"
}
```

### `GET /api/v1/rates/bcv`
Obtiene la tasa oficial vigente del Banco Central de Venezuela.

- **Response (200 OK):**
```json
{
  "currency": "VES",
  "rate_per_usd": 68.45,
  "last_updated": "2026-03-30T14:00:00Z",
  "source": "BCV_OFFICIAL"
}
```

---

## 3. Solicitud de Viajes y Envíos (Ride & Delivery)

### `POST /api/v1/rides/estimate`
Calcula la tarifa estimada en USD y VES detallando opciones de pago en efectivo (sin recargo) versus pago electrónico (con recargo de $0.35 USD).

- **Body:**
```json
{
  "origin": {"lat": 10.4806, "lng": -66.9036, "address": "Plaza Venezuela, Caracas"},
  "destination": {"lat": 10.4910, "lng": -66.8520, "address": "Altamira, Caracas"},
  "service_type": "EXPRESS"
}
```
- **Response (200 OK):**
```json
{
  "distance_km": 6.2,
  "duration_mins": 14,
  "pricing": {
    "bcv_rate": 68.45,
    "cash_payment": {
      "total_amount_usd": 4.50,
      "total_amount_ves": 308.02,
      "jato_service_fee_usd": 0.00
    },
    "electronic_payment": {
      "total_amount_usd": 4.85,
      "total_amount_ves": 331.98,
      "jato_service_fee_usd": 0.35
    },
    "breakdown": {
      "base_fare_usd": 1.50,
      "distance_fare_usd": 2.00,
      "time_fare_usd": 1.00
    }
  }
}
```

---

## 4. WebSocket para Seguimiento en Tiempo Real y SOS

### Endpoint: `wss://ws.jato.app/v1/realtime`

#### Evento: Telemetría de Conductor (Client -> Server)
```json
{
  "event": "DRIVER_TELEMETRY",
  "token": "bearer_jwt",
  "payload": {
    "driver_id": "drv_5512",
    "lat": 10.4851,
    "lng": -66.8921,
    "heading": 120.5,
    "speed_kmh": 42.1,
    "is_mock_gps": false,
    "cell_tower_hash": "a8f12c"
  }
}
```

#### Evento: Activación de Botón de Pánico (Client -> Server)
```json
{
  "event": "TRIGGER_SOS_ALERT",
  "token": "bearer_jwt",
  "payload": {
    "ride_id": "ride_7712a",
    "lat": 10.4851,
    "lng": -66.8921,
    "audio_stream_url": "https://stream.jato.app/sos/audio_9912.m3u8",
    "reason": "USER_MANUAL_PANIC"
  }
}
```

#### Evento: Alerta SOS Confirmada por el Servidor (Server -> Client Broadcast)
```json
{
  "event": "SOS_DISPATCHED",
  "payload": {
    "alert_id": "sos_88123",
    "dispatch_status": "SECURITY_CENTER_NOTIFIED",
    "estimated_response_mins": 3
  }
}
```
