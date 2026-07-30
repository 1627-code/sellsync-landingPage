import prisma from "../lib/prisma.js";
import nodemailer from "nodemailer";

const isProduction = process.env.NODE_ENV === "production";

const transporter = nodemailer.createTransport(isProduction ? {
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    }
} : {
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASSWORD,
    },
});

const CONTACT_TO = process.env.CONTACT_TO || "danielaliyu06@gmail.com";

export const sendContact = async (req, res) => {
    try {
        const { name, email, inquiry, message, consent } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ ok: false, error: "Please fill in name, email, and message." });
        }
        if (!consent) {
            return res.status(400).json({ ok: false, error: "Please accept the privacy policy to continue." });
        }
        const ts = new Date().toISOString();
        const body = `Get in Touch – SellSync\n\nName: ${name}\nEmail: ${email}\nInquiry: ${inquiry || "(not selected)"}\nMessage:\n${message}\n\nSubmitted: ${ts}`;
        await transporter.sendMail({
            from: `"SellSync Contact" <${process.env.EMAIL_USER || "noreply@sellsync.com"}>`,
            to: CONTACT_TO,
            subject: `SellSync Contact: ${inquiry || "General"} – ${name}`,
            text: body,
        });
        res.json({ ok: true });
    } catch (error) {
        console.error("Contact email error:", error);
        res.status(500).json({ ok: false, error: "Failed to send message." });
    }
};

export const subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ ok: false, error: "Email is required." });
        }
        const existing = await prisma.newsletterSubscription.findUnique({ where: { email } });
        if (existing) {
            return res.json({ ok: true, message: "Already subscribed!" });
        }
        await prisma.newsletterSubscription.create({ data: { email } });
        await transporter.sendMail({
            from: `"SellSync" <${process.env.EMAIL_USER || "noreply@sellsync.com"}>`,
            to: email,
            subject: "Welcome to SellSync Newsletter!",
            text: "Thank you for subscribing to the SellSync newsletter! Stay tuned for updates, tips, and exclusive offers.",
        });
        await transporter.sendMail({
            from: `"SellSync Newsletter" <${process.env.EMAIL_USER || "noreply@sellsync.com"}>`,
            to: CONTACT_TO,
            subject: `New Newsletter Subscriber – ${email}`,
            text: `New newsletter subscription\n\nEmail: ${email}\nTime: ${new Date().toISOString()}`,
        });
        res.json({ ok: true, message: "Subscribed successfully!" });
    } catch (error) {
        console.error("Newsletter subscription error:", error);
        res.status(500).json({ ok: false, error: "Failed to subscribe." });
    }
};

export const scheduleCall = async (req, res) => {
    try {
        const { fullName, email, phone, businessName, businessType, intent, preferDate, preferTime, extra } = req.body;
        if (!fullName || !email || !phone || !businessName || !businessType) {
            return res.status(400).json({ ok: false, error: "Please fill in all required fields." });
        }
        if (!preferDate || !preferTime) {
            return res.status(400).json({ ok: false, error: "Please select preferred date and time." });
        }
        const ts = new Date().toISOString();
        const intentStr = Array.isArray(intent) ? intent.join(", ") : intent || "(none)";
        const body = `Schedule a Call – SellSync\n\nFull Name: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nBusiness Name: ${businessName}\nBusiness Type: ${businessType}\nWhat would you like to discuss? ${intentStr}\nPreferred Date: ${preferDate}\nPreferred Time: ${preferTime}\nAnything else: ${extra || "(none)"}\n\nSubmitted: ${ts}`;
        await transporter.sendMail({
            from: `"SellSync Schedule" <${process.env.EMAIL_USER || "noreply@sellsync.com"}>`,
            to: CONTACT_TO,
            subject: `SellSync Schedule Call: ${businessName} – ${fullName}`,
            text: body,
        });
        res.json({ ok: true });
    } catch (error) {
        console.error("Schedule call email error:", error);
        res.status(500).json({ ok: false, error: "Failed to schedule call." });
    }
};
