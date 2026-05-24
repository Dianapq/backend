import PDFParser from "pdf2json"
import Documento from "../models/Documento.js"
import mongoose from "mongoose"

// ─── Extraer texto del PDF ───────────────────────────────
const extraerTextoPDF = (buffer) => {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser()
    parser.on("pdfParser_dataReady", (data) => {
      const texto = data.Pages.map(page =>
        page.Texts.map(t => decodeURIComponent(t.R[0].T)).join(" ")
      ).join("\n")
      resolve(texto)
    })
    parser.on("pdfParser_dataError", reject)
    parser.parseBuffer(buffer)
  })
}

// ─── SUBIR PDF ───────────────────────────────────────────
export const subirPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se recibió ningún archivo" })
    }

    const officeId = req.user.officeId
    const oficina = req.body.oficina || "Sin nombre"
    const filename = req.file.originalname

    const texto = await extraerTextoPDF(req.file.buffer)

    if (!texto || texto.trim().length === 0) {
      return res.status(400).json({ message: "El PDF no tiene texto extraíble" })
    }

    await Documento.create({ oficina, officeId, filename, texto })

    res.json({
      message: "PDF subido correctamente",
      filename,
      caracteres: texto.length
    })

  } catch (error) {
    console.error("Error procesando PDF:", error)
    res.status(500).json({ message: "Error procesando el PDF" })
  }
}

// ─── BUSCAR EN PDFs ──────────────────────────────────────
export const buscarEnPDF = async (req, res) => {
  try {
    const { query } = req.body
    const officeId = req.user.officeId

    const resultados = await Documento.aggregate([
      {
        $search: {
          index: "documentos_search",
          compound: {
            must: [{
              text: {
                query,
                path: "texto",
                fuzzy: { maxEdits: 1 }
              }
            }]
          }
        }
      },
      { $match: { officeId: new mongoose.Types.ObjectId(officeId) } },
      {
        $project: {
          oficina: 1,
          filename: 1,
          score: { $meta: "searchScore" },
          extracto: { $substrCP: ["$texto", 0, 500] }
        }
      },
      { $limit: 3 }
    ])

    res.json(resultados)

  } catch (error) {
    res.status(500).json({ message: "Error buscando en documentos" })
  }
}

// ─── LISTAR PDFs DE LA OFICINA ───────────────────────────
export const listarPDFs = async (req, res) => {
  try {
    const docs = await Documento.find({ officeId: req.user.officeId })
      .select("filename oficina fechaSubida")
      .sort({ fechaSubida: -1 })

    res.json(docs)
  } catch (error) {
    res.status(500).json({ message: "Error listando documentos" })
  }
}