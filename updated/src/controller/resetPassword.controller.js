import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";

const resetPassword = async(req, res) => {
    try {
        const { email, code, password } = req.body;

        if(!email || !code || !password) return res.status(400).json({
            message: "Email, code, and password are required!"
        });

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long",
            });
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if(!user) return res.status(400).json({
            message: "Invalid credentials"
        });

        if(!user.resetPasswordToken || user.resetPasswordToken !== String(code)) {
            return res.status(400).json({
                message: "Invalid reset code"
            });
        }

        if(user.resetPasswordExpiry && user.resetPasswordExpiry < new Date()) {
            return res.status(400).json({
                message: "Reset code has expired. Please request a new one."
            });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: await bcrypt.hash(password, 10),
                passwordChangedAt: new Date(),
                resetPasswordToken: null,
                resetPasswordExpiry: null
            }
        });

        res.status(200).json({
            success: true,
            message: "Password changed successfully! You can now log in.",
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error", 
            error: error.message
        });
    }
};

export { resetPassword };
