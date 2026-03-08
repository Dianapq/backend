import express from "express"
import { crearUsuario } from "../controllers/user.controller.js"
import User from "../models/User.js"
import { verifyToken } from "../middlewares/auth.middleware.js"

const router = express.Router()

// Crear usuario
router.post("/", crearUsuario)

// Obtener todos los usuarios
router.get("/", verifyToken, async (req, res) => {
  try {
    const users = await User.find()
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo usuarios" })
  }
})


// NUEVA RUTA → habilitar / deshabilitar cobrador
router.put("/habilitar/:id", verifyToken, async (req, res) => {
  try {

    const { id } = req.params
    const { habilitado } = req.body

    const user = await User.findByIdAndUpdate(
      id,
      { habilitado },
      { new: true }
    )

    res.json(user)

  } catch (error) {
    res.status(500).json({ message: "Error actualizando usuario" })
  }
})

export default router