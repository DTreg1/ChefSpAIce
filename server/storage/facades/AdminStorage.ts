/**
 * AdminStorage Facade
 * Consolidates administrative storage operations into organized sub-modules
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