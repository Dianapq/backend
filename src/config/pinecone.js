import { Pinecone } from "@pinecone-database/pinecone"

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
})

export const index = pinecone.index(process.env.PINECONE_INDEX)

// ─── Guardar vector en Pinecone ──────────────────────────
export const guardarVector = async (id, texto, metadata = {}) => {
  await index.upsertRecords([{
    id: String(id),
    text: texto,      // Pinecone genera el embedding automáticamente
    ...metadata
  }])
}

// ─── Buscar por significado ──────────────────────────────
export const buscarVectores = async (pregunta, filtro = {}, limit = 5) => {
  const resultados = await index.searchRecords({
    query: {
      inputs: { text: pregunta },
      topK: limit,
      filter: filtro
    },
    fields: ["text", "tipo", "officeId", "mongoId"]
  })

  return resultados.result?.hits || []
}