import { Router } from "express"
import { protect, authorize } from "../middleware/auth.middleware.js"
import { addTerminal, getTerminals, deactivateTerminal, initiatePOSPayment, checkPaymentStatus } from "../controller/posTerminal.controller.js"

const router = Router()

router.post("/:storeId/add", protect, authorize("MANAGER"), addTerminal)
router.get("/:storeId", protect, authorize("MANAGER"), getTerminals)
router.patch("/:storeId/deactivate/:id", protect, authorize("MANAGER"), deactivateTerminal)
router.post("/:storeId/pay", protect, authorize("MANAGER", "CASHIER"), initiatePOSPayment)
router.get("/:storeId/payment/:merchantReference", protect, authorize("MANAGER", "CASHIER"), checkPaymentStatus)

export default router