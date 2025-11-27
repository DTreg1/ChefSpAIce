/**
 * @file server/storage/facades/AdminStorage.ts
 * @description AdminStorage facade consolidating administrative storage operations
 * 
 * EXPORT PATTERN:
 * - Export CLASS (AdminStorage) for dependency injection and testing
 * - Export singleton INSTANCE (adminStorageFacade) for convenience in production code
 * 
 * PATTERN: Facades instantiate their own instances of domain storage classes.
 * This enables dependency injection and isolated testing of each domain.
 * 
 * ERROR HANDLING PATTERN:
 * - Facades do NOT catch and swallow storage errors
 * - Facades add context to errors via proxy wrapper before propagating
 * - StorageErrors bubble up to callers with facade context enrichment
 * - All errors are logged at facade level for observability
 */

import { BillingStorage } from "../domains/billing.storage";
import { SecurityStorage } from "../domains/security.storage";
import { PricingStorage } from "../domains/pricing.storage";
import { ExperimentsStorage } from "../domains/experiments.storage";
import { SupportStorage } from "../domains/support.storage";
import { createDomainStorageProxy } from "./FacadeErrorBoundary";

const FACADE_NAME = "admin" as const;

/**
 * AdminStorage facade that consolidates all admin-related storage modules
 * 
 * All domain storage instances are wrapped with error boundary proxies that:
 * 1. Log errors at facade level for observability
 * 2. Enrich StorageErrors with facade context
 * 3. Propagate errors without transformation (StorageErrors remain StorageErrors)
 */
export class AdminStorage {
  public readonly billing: BillingStorage;
  public readonly security: SecurityStorage;
  public readonly pricing: PricingStorage;
  public readonly experiments: ExperimentsStorage;
  public readonly support: SupportStorage;

  constructor() {
    this.billing = createDomainStorageProxy(
      new BillingStorage(),
      FACADE_NAME,
      "billing"
    );
    this.security = createDomainStorageProxy(
      new SecurityStorage(),
      FACADE_NAME,
      "security"
    );
    this.pricing = createDomainStorageProxy(
      new PricingStorage(),
      FACADE_NAME,
      "pricing"
    );
    this.experiments = createDomainStorageProxy(
      new ExperimentsStorage(),
      FACADE_NAME,
      "experiments"
    );
    this.support = createDomainStorageProxy(
      new SupportStorage(),
      FACADE_NAME,
      "support"
    );
  }
}

/**
 * Singleton instance for convenient usage in production code.
 * Import this when you don't need dependency injection.
 */
export const adminStorageFacade = new AdminStorage();
