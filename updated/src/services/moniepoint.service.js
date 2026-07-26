import dotenv from "dotenv"
dotenv.config()

const MONIEPOINT_BASE_URL = "https://api.pos.moniepoint.com"
const MONIEPOINT_API_KEY = process.env.MONIEPOINT_API_KEY

const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${MONIEPOINT_API_KEY}`
}

// Verify API key is valid
export const introspect = async () => {
    const response = await fetch(`${MONIEPOINT_BASE_URL}/v1/introspect`, {
        method: "GET",
        headers
    })
    const data = await response.json()
    return data
}

// Push payment request to POS terminal
export const pushTransaction = async ({ terminalSerial, amount, merchantReference }) => {
    const response = await fetch(`${MONIEPOINT_BASE_URL}/v1/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            terminalSerial,
            amount: amount * 100, // convert naira to kobo
            merchantReference,
            transactionType: "PURCHASE",
            paymentMethod: "ANY"
        })
    })
    const data = await response.json()
    return data
}

// Check transaction status
export const getTransactionStatus = async (merchantReference) => {
    const response = await fetch(
        `${MONIEPOINT_BASE_URL}/v1/transactions/merchants/${merchantReference}`,
        { method: "GET", headers }
    )
    const data = await response.json()
    return data
}

// Poll until transaction completes or times out
export const pollTransactionStatus = async (merchantReference, maxAttempts = 20) => {
    for (let i = 0; i < maxAttempts; i++) {
        const data = await getTransactionStatus(merchantReference)

        if (data.processingStatus === "SUCCESS") {
            return { success: true, data }
        }

        if (data.processingStatus === "FAILED" || data.processingStatus === "DECLINED") {
            return { success: false, data }
        }

        // Wait 3 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // Timed out after maxAttempts
    return { success: false, data: null, timedOut: true }
}