import mongoose from "mongoose"
import dotenv from "dotenv"
import User from "../src/models/User.js"

dotenv.config()

await mongoose.connect(process.env.MONGO_URI)

const existe = await User.findOne({ rol: "SUPERADMIN" })
if (existe) {
  console.log("⚠️  Ya existe un SUPERADMIN")
  process.exit(0)
}

await User.create({
  nombre: "Super Admin",
  cedula: "000000000",
  celular: "000000000",
  direccion: "Sistema",
  email: "superadmin@cobranzas.com",   
  password: "Gotas123",         
  rol: "SUPERADMIN",
  officeId: null,
  habilitado: true
})

console.log("✅ SUPERADMIN creado correctamente")
process.exit(0)