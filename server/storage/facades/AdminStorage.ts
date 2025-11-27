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
 */

import { BillingStorage } from "../domains/billing.storage";
import { SecurityStorage } from "../domains/security.storage";
import { PricingStorage } from "../domains/pricing.storage";
import { ExperimentsStorage } from "../domains/experiments.storage";
import { SupportStorage } from "../domains/support.storage";

/**
 * AdminStorage facade that consolidates all admin-related storage modules
 */
export class AdminStorage {
  public readonly billing: BillingStorage;
  public readonly security: SecurityStorage;
  public readonly pricing: PricingStorage;
  public readonly experiments: ExperimentsStorage;
  public readonly support: SupportStorage;

  constructor() {
    this.billing = new BillingStorage();
    this.security = new SecurityStorage();
    this.pricing = new PricingStorage();
    this.experiments = new ExperimentsStorage();
    this.support = new SupportStorage();
  }
}

/**
 * Singleton instance for convenient usage in production code.
 * Import this when you don't need dependency injection.
 */
export const adminStorageFacade = new AdminStorage();