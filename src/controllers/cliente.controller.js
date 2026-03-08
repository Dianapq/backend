import Cliente from "../models/Cliente.js"

/*
========================================
CREAR CLIENTE
========================================
*/
export const crearCliente = async (req, res) => {
  try {
    const { nombre, cedula, telefono, direccion, cobrador } = req.body

    if (!nombre || !cedula) {
      return res.status(400).json({
        message: "Nombre y cédula son obligatorios"
      })
    }

    const nuevoCliente = await Cliente.create({
      nombre,
      cedula,
      telefono,
      direccion,
      cobrador: cobrador || req.user.userId
    })

    return res.status(201).json(nuevoCliente)

  } catch (error) {
    console.log("Error creando cliente:", error)

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Ya existe un cliente con esa cédula"
      })
    }

    return res.status(500).json({ message: "Error creando cliente" })
  }
}

/*
========================================
OBTENER CLIENTES SEGÚN ROL
========================================
*/
export const obtenerMisClientes = async (req, res) => {
  try {
    let filtro = {}

    if (req.user.rol === "COBRADOR") {
      filtro = { cobrador: req.user.userId }
    }

    const clientes = await Cliente.find(filtro)
      .populate("cobrador", "nombre email")

    return res.json(clientes)

  } catch (error) {
    console.log("Error obteniendo clientes:", error)
    return res.status(500).json({ message: "Error obteniendo clientes" })
  }
}

/*
========================================
OBTENER CLIENTES POR COBRADOR (ADMIN)
========================================
*/
export const obtenerClientesPorCobrador = async (req, res) => {
  try {
    const { cobradorId } = req.params

    const clientes = await Cliente.find({ cobrador: cobradorId })
      .populate("cobrador", "nombre email")

    res.json(clientes)

  } catch (error) {
    console.log("Error obteniendo clientes por cobrador:", error)
    res.status(500).json({ message: "Error obteniendo clientes" })
  }
}