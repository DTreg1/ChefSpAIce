import { Router } from "express";
import loginRouter from "./auth/login";
import registerRouter from "./auth/register";
import passwordResetRouter from "./auth/password-reset";
import sessionManagementRouter from "./auth/session-management";
import accountSettingsRouter from "./auth/account-settings";

const router = Router();

router.use(loginRouter);
router.use(registerRouter);
router.use(passwordResetRouter);
router.use(sessionManagementRouter);
router.use(accountSettingsRouter);

export default router;
