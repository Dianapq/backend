import express from "express"
import mongoose from "mongoose"
import cors from "cors"

import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/userRoutes.js"
import clienteRoutes from "./routes/cliente.routes.js"
import creditoRoutes from "./routes/credito.routes.js"
import officeRoutes from "./routes/oficina.routes.js"
import superadminRoutes from "./routes/Superadmin.routes.js"
import telegramRoutes from "./routes/telegram.routes.js"  // ← nuevo

const app = express()

app.use(cors())
app.use(express.json())

// 🔹 Rutas API
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/clientes", clienteRoutes)
app.use("/api/creditos", creditoRoutes)
app.use("/api/oficinas", officeRoutes)
app.use("/api/superadmin", superadminRoutes)
app.use("/api/telegram", telegramRoutes)  // ← nuevo

// 🔹 Conexión MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB")
    registrarWebhook()  // ← nuevo
  })
  .catch((err) => {
    console.error("❌ Error MongoDB:", err)
  })

// ← nuevo
const registrarWebhook = async () => {
  const token = process.env.TELEGRAM_TOKEN
  if (!token) { console.log("⚠️  TELEGRAM_TOKEN no definido"); return }
  const webhookUrl = "https://backend-iwr8.onrender.com/api/telegram/webhook"
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`)
    const data = await res.json()
    console.log(" Webhook:", data.ok ? " Registrado" : data.description)
  } catch (err) {
    console.error(" Error webhook:", err.message)
  }
}

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
})