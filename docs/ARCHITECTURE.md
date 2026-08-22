# Arquitectura del Sistema: Jato SuperApp

## 1. Visión General de la Arquitectura de Microservicios

La arquitectura de **Jato** está diseñada sobre un modelo de microservicios distribuido y reactivo, desacoplado mediante eventos (Event-Driven Architecture) con NATS/Kafka, diseñado para alta disponibilidad, tolerancia a fallos en redes móviles inestables y baja latencia (< 50ms para operaciones en tiempo real).

```text
                                [ Mobile Clients (iOS / Android) ]
                                                │
                                                ▼
                                   [ Cloudflare Magic Transit ]
                                   (DDoS Protection & Web WAF)
                                                │
                                                ▼
                                    [ Jato API Gateway ]
                     (Kong / Envoy + SSL Pinning + Device Attestation)
                                                │
         ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
         ▼                      ▼                               ▼                      ▼
┌──────────────────┐  ┌──────────────────┐             ┌──────────────────┐  ┌──────────────────┐
│ Auth & Security  │  │ Real-Time Engine │             │ Payment Service  │  │ Safety & SOS     │
│ Service (mTLS)   │  │ (Geo / Dispatch) │             │ (VE & Crypto)    │  │ Service (Shield) │
└────────┬─────────┘  └────────┬─────────┘             └────────┬─────────┘  └────────┬─────────┘
         │                     │                                │                     │
         └─────────────────────┼────────────────────────────────┴─────────────────────┘
                               ▼
                       [ Event Bus: NATS ]
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ PostgreSQL Cluster│  │ Redis Geo Cluster│  │ TimeScaleDB      │
│ (User & Rides)   │  │ (Driver Cache)   │  │ (Telemetry/Logs) │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 2. Capas Principales de Seguridad Informatica (Zero-Trust Architecture)

### 2.1. Protección Contra Ataques y Hackeos (Application Security)
1. **Atestación de Dispositivo (Hardware-backed Device Attestation)**:
   - Uso de SafetyNet / Play Integrity API en Android y DeviceCheck / App Attest en iOS para verificar la autenticidad del binario compilado y asegurar que no está corriendo sobre un entorno modificado, emulador o instalador malicioso.
2. **Payload Encryption y Firma HMAC-SHA256**:
   - Cada solicitud HTTP/WebSocket lleva un encabezado `X-Jato-Signature` generado con clave efímera derivativa (ECDH) y HMAC-SHA256 para evitar inyección o modificación de parámetros en tránsito.
3. **Control Anti-Spoofing de Ubicación GPS**:
   - Algoritmo en el cliente nativo que analiza métricas de hardware:
     - Detección de `isFromMockProvider` en Android API.
     - Triangulación Wi-Fi BSSID y Cell Tower ID.
     - Verificación de consistencia física con velocidad calculada por acelerómetro (filtro de Kalman). Si un vehículo se desplaza a velocidades imposibles o con cambios repentinos de latitud/longitud sin aceleración cinemática adecuada, la actualización es rechazada y la cuenta entra en revisión preventiva.

### 2.2. Seguridad de Datos y Cifrado
- **Cifrado de Base de Datos**: Cifrado transparente de base de datos (TDE) mediante AES-256-GCM.
- **Campos Sensibles**: Números de cédula, teléfono, datos bancarios y tokens de Binance/Zelle son encriptados a nivel de aplicación con llaves gestionadas en AWS KMS / HashiCorp Vault.

---

## 3. Arquitectura del Motor de Pagos Venezolano (Jato Pay Engine)

El motor de pagos resuelve los desafíos específicos de la economía monetaria mixta en Venezuela:

### 3.1. Orquestador de Pago Móvil C2P & P2P
- **Canal Directo C2P**: Integración API REST/SOAP con sucursales bancarias nacionales para realizar débitos directos enviando Cédula, Teléfono, Banco Origen y Token SMS de pago generado por el usuario.
- **Conciliación Inteligente P2P**: Los pagos de usuario a las cuentas jurídicas de Jato se concilian en tiempo real escuchando los webhooks y notificadores bancarios (Banesco, Mercantil, BDV) matcheando: `Monto + Teléfono Emisor + Referencia Única`.

### 3.2. Cotización y Gestión Multimoneda (USD / VES / USDT)
- **Tasa BCV Sync**: Microservicio con redundancia triple que consulta la tasa oficial del Banco Central de Venezuela en intervalos de 5 minutos y actualiza las cotizaciones en tiempo real en Redis Cache.
- **Sincronización Binance Pay**: Integración con API Binance Merchant para cobro instantáneo en USDT mediante QR o Deep Link con confirmación en subsegundo via WebSockets.

---

## 4. Motor de Despacho y Monitoreo SOS (Jato Shield)

### 4.1. Algoritmo de Coincidencia Ride/Delivery
1. **Filtro de Proximidad Geo-Spatial (H3 Spatial Index)**: En lugar de cálculos Haversine tradicionales, la ubicación de conductores se agrupa usando hexágonos H3 de Uber a nivel de resolución 8-9 en Redis Geo spatial indices.
2. **Scoring Dinámico de Asignación**:
   $$\text{Score} = w_1 \cdot \text{ETA} + w_2 \cdot \text{DriverRating} + w_3 \cdot \text{AcceptanceRate} - w_4 \cdot \text{CancellationRate}$$
   Donde los pesos $w_i$ priorizan al conductor más confiable y cercano.

### 4.2. Flujo de Respuesta de Emergencia SOS
- **Activación**: Por botón directo en la app o por anomalía detectada (ej. detención imprevista > 5 min fuera de ruta).
- **Acciones Inmediatas**:
  1. Apertura de canal de audio bidireccional encriptado con el Centro de Operaciones de Seguridad de Jato.
  2. Notificación push a contactos de confianza predefinidos por el usuario con enlace de rastreo en vivo.
  3. Despacho directo a unidades de patrullaje o autoridades locales registradas según la geocerca actual.
