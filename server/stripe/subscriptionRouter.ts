import { Router } from "express";
import checkoutRouter from "./subscription/checkout";
import managementRouter from "./subscription/management";
import entitlementsRouter from "./subscription/entitlements";

const router = Router();

router.use(checkoutRouter);
router.use(managementRouter);
router.use(entitlementsRouter);

export default router;
