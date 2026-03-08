import Credito from "../models/Credito.js"
import Cliente from "../models/Cliente.js"
import jwt from "jsonwebtoken"

/*
========================================
HELPER - VALIDAR TOKEN
========================================
*/
const obtenerUsuarioDesdeToken = (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return null

  const token = authHeader.split(" ")[1]
  return jwt.verify(token, process.env.JWT_SECRET)
}

/*
========================================
CREAR CRÉDITO
========================================
*/
export const crearCredito = async (req, res) => {
  try {

    const decoded = obtenerUsuarioDesdeToken(req)
    if (!decoded) {
      return res.status(401).json({ message: "No autorizado" })
    }

    const { clienteId, montoPrestamo, montoAPagar, fechaPago } = req.body

    if (!clienteId || !montoPrestamo || !montoAPagar || !fechaPago) {
      return res.status(400).json({ message: "Datos incompletos" })
    }

    const cliente = await Cliente.findById(clienteId)
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" })
    }

    // No permitir otro pendiente
    const creditoPendiente = await Credito.findOne({
      clienteId,
      estado: "PENDIENTE"
    })

    if (creditoPendiente) {
      return res.status(400).json({
        message:
          "El cliente ya tiene un crédito pendiente. Debe pagarlo antes de crear uno nuevo."
      })
    }

    const nuevoCredito = await Credito.create({
      clienteId,
      cobradorId: decoded.userId,
      montoPrestamo: Number(montoPrestamo),
      montoAPagar: Number(montoAPagar),
      saldoPendiente: Number(montoAPagar),
      fechaPago: new Date(fechaPago),
      abonos: []
    })

    res.status(201).json(nuevoCredito)

  } catch (error) {
    console.log("Error creando crédito:", error)
    res.status(500).json({ message: "Error creando crédito" })
  }
}

/*
========================================
OBTENER CRÉDITOS POR CLIENTE
========================================
*/
export const obtenerCreditosPorCliente = async (req, res) => {
  try {

    const { clienteId } = req.params

    const creditos = await Credito.find({ clienteId })
      .populate("clienteId", "nombre cedula")
      .sort({ createdAt: -1 })

    res.json(creditos)

  } catch (error) {
    console.log("Error obteniendo créditos:", error)
    res.status(500).json({ message: "Error obteniendo créditos" })
  }
}

/*
========================================
OBTENER TODOS LOS CRÉDITOS DEL COBRADOR
========================================
*/
export const obtenerCreditosDelCobrador = async (req, res) => {
  try {

    const decoded = obtenerUsuarioDesdeToken(req)
    if (!decoded) {
      return res.status(401).json({ message: "No autorizado" })
    }

    const creditos = await Credito.find({
      cobradorId: decoded.userId
    })
      .populate("clienteId", "nombre cedula")
      .sort({ createdAt: -1 })

    res.json(creditos)

  } catch (error) {
    console.log("Error obteniendo créditos:", error)
    res.status(500).json({ message: "Error obteniendo créditos" })
  }
}

/*
========================================
ABONAR A CRÉDITO
========================================
*/
export const abonarCredito = async (req, res) => {
  try {

    const decoded = obtenerUsuarioDesdeToken(req)
    if (!decoded) {
      return res.status(401).json({ message: "No autorizado" })
    }

    const { id } = req.params
    const { monto } = req.body

    if (!monto || Number(monto) <= 0) {
      return res.status(400).json({ message: "Monto inválido" })
    }

    const credito = await Credito.findById(id)

    if (!credito) {
      return res.status(404).json({ message: "Crédito no encontrado" })
    }

    // Solo el dueño puede abonar
    if (credito.cobradorId.toString() !== decoded.userId) {
      return res.status(403).json({ message: "No autorizado para este crédito" })
    }

    if (credito.estado === "PAGADO") {
      return res.status(400).json({ message: "El crédito ya está pagado" })
    }

    if (Number(monto) > credito.saldoPendiente) {
      return res.status(400).json({
        message: "El abono no puede ser mayor al saldo pendiente"
      })
    }

    credito.saldoPendiente -= Number(monto)

    if (!credito.abonos) credito.abonos = []

    credito.abonos.push({
      monto: Number(monto),
      fecha: new Date()
    })

    if (credito.saldoPendiente === 0) {
      credito.estado = "PAGADO"
    }

    await credito.save()

    res.json({
      message: "Abono registrado correctamente",
      credito
    })

  } catch (error) {
    console.log("Error registrando abono:", error)
    res.status(500).json({ message: "Error registrando abono" })
  }
}

/*
========================================
MARCAR COMO PAGADO
========================================
*/
export const marcarComoPagado = async (req, res) => {
  try {

    const decoded = obtenerUsuarioDesdeToken(req)
    if (!decoded) {
      return res.status(401).json({ message: "No autorizado" })
    }

    const { id } = req.params

    const credito = await Credito.findById(id)

    if (!credito) {
      return res.status(404).json({ message: "Crédito no encontrado" })
    }

    if (credito.cobradorId.toString() !== decoded.userId) {
      return res.status(403).json({ message: "No autorizado para este crédito" })
    }

    credito.estado = "PAGADO"
    credito.saldoPendiente = 0

    await credito.save()

    res.json({ message: "Crédito marcado como PAGADO" })

  } catch (error) {
    console.log("Error marcando crédito como pagado:", error)
    res.status(500).json({ message: "Error actualizando crédito" })
  }
}

/*
========================================
OBTENER CRÉDITOS POR COBRADOR (ADMIN)
========================================
*/
export const obtenerCreditosPorCobrador = async (req, res) => {
  try {

    const { cobradorId } = req.params

    if (!cobradorId) {
      return res.status(400).json({ message: "CobradorId requerido" })
    }

    const creditos = await Credito.find({ cobradorId })
      .populate("clienteId", "nombre cedula")
      .sort({ createdAt: -1 })

    res.json(creditos)

  } catch (error) {
    console.log("Error obteniendo créditos por cobrador:", error)
    res.status(500).json({ message: "Error obteniendo créditos" })
  }
}