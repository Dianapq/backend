import express from "express"
import multer from "multer"
import { verifyToken } from "../middlewares/auth.middleware.js"
import { subirPDF, buscarEnPDF, listarPDFs } from "../controllers/pdf.controller.js"

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post("/subir", verifyToken, upload.single("file"), subirPDF)
router.post("/buscar", verifyToken, buscarEnPDF)
router.get("/", verifyToken, listarPDFs)

export default router