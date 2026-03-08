import User from "../models/User.js"

export const crearUsuario = async (req, res) => {
  try {
    console.log("🟢 BODY RECIBIDO:", req.body)

    const {
      nombre,
      cedula,
      celular,
      direccion,
      email,
      password,
      rol
    } = req.body

    if (!nombre || !cedula || !celular || !direccion || !email || !password || !rol) {
      console.log("🔴 Faltan campos:", {
        nombre,
        cedula,
        celular,
        direccion,
        email,
        password,
        rol
      })
      return res.status(400).json({ message: "Faltan campos obligatorios" })
    }

    const emailNormalizado = email.trim().toLowerCase()

    const existe = await User.findOne({ email: emailNormalizado })

    if (existe) {
      console.log("🔴 Usuario ya existe")
      return res.status(400).json({ message: "El usuario ya existe" })
    }

    const nuevoUsuario = new User({
      nombre,
      cedula,
      celular,
      direccion,
      email: emailNormalizado,
      password,
      rol
    })

    await nuevoUsuario.save()

    console.log("✅ Usuario guardado correctamente")

    res.status(201).json({ message: "Usuario creado correctamente" })

  } catch (error) {
    console.error("🔥 ERROR CREAR USUARIO:", error)
    res.status(500).json({ message: error.message })
  }
}