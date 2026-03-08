import mongoose from "mongoose"

const clienteSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },

  cedula: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  telefono: {
    type: String,
    trim: true
  },

  direccion: {
    type: String,
    trim: true
  },

  cobrador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, {
  timestamps: true
})

export default mongoose.model("Cliente", clienteSchema)