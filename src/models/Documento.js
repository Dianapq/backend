import mongoose from "mongoose"

const documentoSchema = new mongoose.Schema({
  oficina: { type: String, required: true },
  officeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Office",
    required: true
  },
  filename: { type: String, required: true },
  texto: { type: String, required: true },
  chunk: { type: Number, default: 0 },
  fechaSubida: { type: Date, default: Date.now }
})

export default mongoose.model("Documento", documentoSchema)