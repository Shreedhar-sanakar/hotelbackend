import express from "express";
const routerStripe = express.Router();

//middlewares
import { requireSignin } from "../middlewares/index.js";
//controllers
import {
  createConnectAccount,
  getAccountStatus,
  getAccountBalance,
  payoutSetting,
  stripeSessionId,
  stripeSuccess,
} from "../controllers/stripe.js";

routerStripe.post(
  "/create-connect-account",
  requireSignin,
  createConnectAccount
);
routerStripe.post("/get-account-status", requireSignin, getAccountStatus);
routerStripe.post("/get-account-balance", requireSignin, getAccountBalance);
routerStripe.post("/payout-setting", requireSignin, payoutSetting);
routerStripe.post("/stripe-session-id", requireSignin, stripeSessionId);

//order
routerStripe.post("/stripe-success", requireSignin, stripeSuccess);

export default routerStripe;
