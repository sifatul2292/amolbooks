import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { lastValueFrom } from 'rxjs';

/**
 * EPS (Easy Payment System, eps.com.bd) payment gateway client.
 * Settings come only from env vars (never commit their values):
 * EPS_BASE_URL (sandbox: https://sandboxpgapi.eps.com.bd), EPS_USERNAME, EPS_PASSWORD,
 * EPS_HASH_KEY, EPS_STORE_ID EPS_MERCHANT_ID. EPS_ENABLED=false disables the integration.
 */

export interface EpsInitializeInput {
  merchantTransactionId: string;
  customerOrderId: string;
  totalAmount: number;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipAddress?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postcode: string;
  };
  products: { name: string; quantity: number; price: number }[];
  valueA?: string;
}

export interface EpsInitializeResult {
  transactionId: string;
  redirectUrl: string;
}

export interface EpsStatusResult {
  status: string;
  totalAmount: number | null;
  financialEntity: string;
  merchantTransactionId: string;
  transactionDate: string;
  errorCode: string;
  errorMessage: string;
}

export class EpsError extends Error {
  constructor(message: string, readonly httpStatus?: number) {
    super(message);
  }
}

const REQUIRED_SETTINGS = [
  'EPS_BASE_URL',
  'EPS_USERNAME',
  'EPS_PASSWORD',
  'EPS_HASH_KEY',
  'EPS_STORE_ID',
  'EPS_MERCHANT_ID',
];
const REQUEST_TIMEOUT_MS = 20000;
const MAX_TOKEN_LIFETIME_MS = 50 * 60 * 1000;

@Injectable()
export class EpsService {
  private readonly logger = new Logger(EpsService.name);
  private token: { value: string; expiresAt: number } | null = null;
  private tokenRequest: Promise<string> | null = null;
  private sandboxWarned = false;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private setting(name: string): string {
    return String(this.config.get<string>(name) ?? process.env[name] ?? '').trim();
  }

  isConfigured(): boolean {
    if (this.setting('EPS_ENABLED') === 'false') return false;
    if (!REQUIRED_SETTINGS.every((name) => !!this.setting(name))) return false;
    // Sandbox (test money) must never mark orders in the live database as paid by mistake.
    if (
      /sandbox/i.test(this.setting('EPS_BASE_URL')) &&
      this.setting('PRODUCTION_BUILD') === 'true' &&
      this.setting('EPS_ALLOW_SANDBOX') !== 'true'
    ) {
      if (!this.sandboxWarned) {
        this.sandboxWarned = true;
        this.logger.warn(
          'EPS sandbox settings with PRODUCTION_BUILD=true: online payment stays off (set EPS_ALLOW_SANDBOX=true only on a test database).',
        );
      }
      return false;
    }
    return true;
  }

  /** EPS x-hash: Base64(HMAC-SHA512(key = UTF-8 hash key, data)). */
  hash(data: string): string {
    return crypto
      .createHmac('sha512', Buffer.from(this.setting('EPS_HASH_KEY'), 'utf8'))
      .update(String(data), 'utf8')
      .digest('base64');
  }

  /** Unique per payment attempt, digits only (EPS needs at least 10). */
  static newMerchantTransactionId(): string {
    return `${Date.now()}${crypto.randomInt(0, 1000000).toString().padStart(6, '0')}`;
  }

  async initialize(input: EpsInitializeInput): Promise<EpsInitializeResult> {
    const merchantId = this.setting('EPS_MERCHANT_ID');
    const customer = input.customer;
    const products = input.products.length
      ? input.products
      : [{ name: 'Books', quantity: 1, price: input.totalAmount }];
    const itemCount = products.reduce((sum, item) => sum + item.quantity, 0);
    const productName =
      products.length > 1
        ? `${products[0].name} + ${products.length - 1} more`
        : products[0].name;
    const body: Record<string, any> = {
      ...(merchantId ? { merchantId } : {}),
      storeId: this.setting('EPS_STORE_ID'),
      CustomerOrderId: input.customerOrderId,
      merchantTransactionId: input.merchantTransactionId,
      transactionTypeId: 1, // 1 = web
      financialEntityId: 0,
      transitionStatusId: 0,
      totalAmount: input.totalAmount,
      ipAddress: input.ipAddress || '0.0.0.0',
      version: '1',
      successUrl: input.successUrl,
      failUrl: input.failUrl,
      cancelUrl: input.cancelUrl,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAddress: customer.address,
      customerAddress2: '',
      customerCity: customer.city,
      customerState: customer.state,
      customerPostcode: customer.postcode,
      customerCountry: 'BD',
      customerPhone: customer.phone,
      shipmentName: customer.name,
      shipmentAddress: customer.address,
      shipmentAddress2: '',
      shipmentCity: customer.city,
      shipmentState: customer.state,
      shipmentPostcode: customer.postcode,
      shipmentCountry: 'BD',
      valueA: input.valueA || '',
      valueB: '',
      valueC: '',
      valueD: '',
      shippingMethod: 'Courier',
      noOfItem: String(itemCount),
      productName: productName.slice(0, 100),
      productProfile: 'general',
      productCategory: 'Book',
      ProductList: products.map((item) => ({
        ProductName: item.name.slice(0, 100),
        NoOfItem: String(item.quantity),
        ProductProfile: 'general',
        ProductCategory: 'Book',
        ProductPrice: String(item.price),
      })),
    };
    const res = await this.authorized(
      'post',
      '/v1/EPSEngine/InitializeEPS',
      body,
      input.merchantTransactionId,
    );
    const transactionId = res?.TransactionId ?? res?.transactionId;
    const redirectUrl = res?.RedirectURL ?? res?.redirectURL ?? res?.redirectUrl;
    if (!transactionId || !redirectUrl) {
      throw new EpsError(
        `EPS did not start the payment: ${
          res?.ErrorMessage || res?.errorMessage || 'no payment page returned'
        }`,
      );
    }
    // https only; plain http just for a local test double (EPS_BASE_URL on this machine).
    const loopback = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i;
    if (
      !/^https:\/\//i.test(String(redirectUrl)) &&
      !(loopback.test(String(redirectUrl)) && loopback.test(this.baseUrl() + '/'))
    ) {
      throw new EpsError('EPS returned an unexpected payment page address');
    }
    return { transactionId: String(transactionId), redirectUrl: String(redirectUrl) };
  }

  async checkStatus(merchantTransactionId: string): Promise<EpsStatusResult> {
    const res = await this.authorized(
      'get',
      `/v1/EPSEngine/CheckMerchantTransactionStatus?merchantTransactionId=${encodeURIComponent(
        merchantTransactionId,
      )}`,
      null,
      merchantTransactionId,
    );
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        if (res && res[key] !== undefined && res[key] !== null) return res[key];
      }
      return '';
    };
    const amountText = String(pick('TotalAmount', 'totalAmount')).replace(/,/g, '').trim();
    const amount = amountText === '' ? NaN : Number(amountText);
    return {
      status: String(pick('Status', 'status')).trim(),
      totalAmount: Number.isFinite(amount) ? amount : null,
      financialEntity: String(pick('FinancialEntity', 'financialEntity')).trim(),
      merchantTransactionId: String(
        pick('MerchantTransactionId', 'merchantTransactionId'),
      ).trim(),
      transactionDate: String(pick('TransactionDate', 'transactionDate')).trim(),
      errorCode: String(pick('ErrorCode', 'errorCode')).trim(),
      errorMessage: String(pick('ErrorMessage', 'errorMessage')).trim(),
    };
  }

  private baseUrl(): string {
    return this.setting('EPS_BASE_URL').replace(/\/+$/, '');
  }

  private async getToken(force = false): Promise<string> {
    if (!force && this.token && this.token.expiresAt > Date.now()) {
      return this.token.value;
    }
    if (!this.tokenRequest) {
      this.tokenRequest = this.fetchToken().finally(() => {
        this.tokenRequest = null;
      });
    }
    return this.tokenRequest;
  }

  private async fetchToken(): Promise<string> {
    const userName = this.setting('EPS_USERNAME');
    const res = await this.request(
      'post',
      '/v1/Auth/GetToken',
      { userName, password: this.setting('EPS_PASSWORD') },
      { 'x-hash': this.hash(userName) },
    );
    if (!res?.token) {
      this.token = null;
      throw new EpsError(
        `EPS login refused: ${res?.errorMessage || res?.ErrorMessage || 'no token'}`,
      );
    }
    this.token = { value: String(res.token), expiresAt: this.tokenExpiry(res.expireDate) };
    return this.token.value;
  }

  /**
   * expireDate has no time zone. Read it both as UTC and as Dhaka time and keep the
   * earlier one (less two minutes), never longer than 50 minutes.
   */
  private tokenExpiry(expireDate: unknown): number {
    const now = Date.now();
    const text = String(expireDate || '').trim().replace(/(\.\d{3})\d+/, '$1');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return now + 10 * 60 * 1000;
    const zoned = /(Z|[+-]\d{2}:?\d{2})$/i.test(text);
    const candidates = (zoned
      ? [Date.parse(text)]
      : [Date.parse(text + 'Z'), Date.parse(text + '+06:00')]
    ).filter(Number.isFinite);
    if (!candidates.length) return now + 10 * 60 * 1000;
    return Math.min(now + MAX_TOKEN_LIFETIME_MS, Math.min(...candidates) - 2 * 60 * 1000);
  }

  private async authorized(
    method: 'get' | 'post',
    path: string,
    body: any,
    hashOf: string,
  ): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      const token = await this.getToken(attempt > 0);
      try {
        return await this.request(method, path, body, {
          Authorization: `Bearer ${token}`,
          'x-hash': this.hash(hashOf),
        });
      } catch (error) {
        // Expired or revoked token: log in again once.
        if (attempt === 0 && error instanceof EpsError && error.httpStatus === 401) {
          this.token = null;
          continue;
        }
        throw error;
      }
    }
  }

  private async request(
    method: 'get' | 'post',
    path: string,
    body: any,
    headers: Record<string, string>,
  ): Promise<any> {
    const url = this.baseUrl() + path;
    try {
      const res =
        method === 'get'
          ? await lastValueFrom(
              this.http.get(url, {
                headers: { Accept: 'application/json', ...headers },
                timeout: REQUEST_TIMEOUT_MS,
              }),
            )
          : await lastValueFrom(
              this.http.post(url, body, {
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  ...headers,
                },
                timeout: REQUEST_TIMEOUT_MS,
              }),
            );
      return res.data;
    } catch (error) {
      const status = error?.response?.status;
      // Messages only; EPS replies can contain customer details.
      this.logger.warn(`EPS ${path.split('?')[0]} failed${status ? ` (HTTP ${status})` : ''}: ${error?.message}`);
      throw new EpsError(
        `EPS request failed${status ? ` (HTTP ${status})` : ''}: ${error?.message || 'network error'}`,
        status,
      );
    }
  }
}
