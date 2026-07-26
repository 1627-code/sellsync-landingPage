import prisma from "../lib/prisma.js"
import { pushTransaction } from "../services/moniepoint.service.js"
import logAction from "../utils/auditLog.js"

const addTerminal = async(req, res) => {
    try {

        const { terminalSerial, label } = req.body;

        // Validate that all required fields are provided
        if(!terminalSerial) return res.status(404).json({
            message: "terminalSerial required!"
        });

        // Retrieve the authenticated manager's store
        const store = await prisma.store.findFirst({
            where: {
                id: req.params.storeId,
                ownerId: req.user.id
            }
        });

        if(!store) return res.status(404).json({ message: "Store not found" });

        const existingTerminal = await prisma.posTerminal.findUnique({
            where: {terminalSerial}
        })

        if(existingTerminal) return res.status(400).json({
            message: "Terminal already registered!"
        })

        const posTerminal = await prisma.posTerminal.create({
            data: {
                storeId: store.id,
                terminalSerial,
                label
            }
        })

        await logAction({ 
            userId: req.user.id, 
            action: "CREATE_POSTERMINAL", 
            entity: "PosTerminal", 
            entityId: posTerminal.id, 
            storeId: store.id 
        })

        res.status(200).json({
            message: "POS Terminal added successfully!"
        })

    } catch (error) {
         // Log and return server error
        res.status(500).json({
            message: "Internal Server error!", error
        });
  }
}

const getTerminals = async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
            where: { id: req.params.storeId, ownerId: req.user.id }
        })
        if(!store) return res.status(404).json({ message: "Store not found" })

        const terminals = await prisma.posTerminal.findMany({
            where: { storeId: store.id }
        })

        res.status(200).json({ success: true, terminals })
    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error })
    }
}

const deactivateTerminal = async (req, res) => {
    try {
        const store = await prisma.store.findFirst({
            where: { id: req.params.storeId, ownerId: req.user.id }
        })
        if(!store) return res.status(404).json({ message: "Store not found" })

        const terminal = await prisma.posTerminal.findUnique({
            where: { id: req.params.id }
        })
        if(!terminal || terminal.storeId !== store.id) {
            return res.status(404).json({ message: "Terminal not found" })
        }

        await prisma.posTerminal.update({
            where: { id: terminal.id },
            data: { isActive: false }
        })

        await logAction({
            userId: req.user.id,
            action: "DEACTIVATE_POSTERMINAL",
            entity: "PosTerminal",
            entityId: terminal.id,
            storeId: store.id
        })

        res.status(200).json({ success: true, message: "Terminal deactivated successfully!" })
    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error })
    }
}

const initiatePOSPayment = async (req, res) => {
    try {
        const { amount, terminalId } = req.body

        if(!amount || !terminalId) return res.status(400).json({
            message: "amount and terminalId are required!"
        })

        const store = await prisma.store.findFirst({
            where: { id: req.params.storeId, ownerId: req.user.id }
        })
        if(!store) return res.status(404).json({ message: "Store not found" })

        const terminal = await prisma.posTerminal.findUnique({
            where: { id: terminalId }
        })
        if(!terminal || terminal.storeId !== store.id || !terminal.isActive) {
            return res.status(404).json({ message: "Terminal not found or inactive" })
        }

        // Generate a unique merchant reference
        const merchantReference = `SELLSYNC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        const result = await pushTransaction({
            terminalSerial: terminal.terminalSerial,
            amount,
            merchantReference
        })

        res.status(200).json({
            success: true,
            merchantReference,
            message: "Payment request sent to terminal",
            data: result
        })
    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error })
    }
}

const checkPaymentStatus = async (req, res) => {
    try {
        const { merchantReference } = req.params
        const result = await getTransactionStatus(merchantReference)
        res.status(200).json({ success: true, data: result })
    } catch (error) {
        res.status(500).json({ message: "Internal Server error!", error })
    }
}

export { addTerminal, getTerminals, deactivateTerminal, initiatePOSPayment, checkPaymentStatus }