import express from "express"
import { loginAdmin, loginCobrador } from "../controllers/auth.controller.js"

const router = express.Router()

router.post("/login-admin", loginAdmin)
router.post("/login-cobrador", loginCobrador)

export default router