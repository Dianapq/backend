import { Router } from "express"
import { handleWebhook } from "../controllers/telegram.controller.js"

const router = Router()

// Telegram llama a esta URL cuando hay un mensaje
router.post("/webhook", handleWebhook)

export default router