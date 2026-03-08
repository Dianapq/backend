import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"

import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/userRoutes.js"
import clienteRoutes from "./routes/cliente.routes.js"
import creditoRoutes from "./routes/credito.routes.js"

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// 🔹 Rutas API
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/clientes", clienteRoutes)
app.use("/api/creditos", creditoRoutes)   // 
// 🔹 Conexión MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB")
  })
  .catch((err) => {
    console.error("❌ Error MongoDB:", err)
  })

const PORT = 3000

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
})