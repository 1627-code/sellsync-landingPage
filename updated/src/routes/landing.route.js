import { Router } from "express";
import { sendContact, subscribeNewsletter, scheduleCall } from "../controller/landing.controller.js";

const router = Router();

router.post("/contact", sendContact);
router.post("/newsletter", subscribeNewsletter);
router.post("/schedule-call", scheduleCall);

export default router;
