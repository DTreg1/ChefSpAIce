import { Router } from 'express';
import { createABTestSeedEndpoint } from './seed-ab-tests';
import { createCohortSeedEndpoint } from './seed-cohorts';
import { storage } from '../storage/index';

export function createSeedRouter(storageInstance: typeof storage = storage) {
  const router = Router();
  
  const abTestRouter = createABTestSeedEndpoint(storageInstance);
  const cohortRouter = createCohortSeedEndpoint(storageInstance);
  
  router.use(abTestRouter);
  router.use(cohortRouter);
  
  return router;
}

export { seedCohorts } from './seed-cohorts';
