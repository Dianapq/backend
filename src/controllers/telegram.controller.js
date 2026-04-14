import Cliente from "../models/Cliente.js"
import Credito from "../models/Credito.js"
import User from "../models/User.js"

const TOKEN = process.env.TELEGRAM_TOKEN
const API = `https://api.telegram.org/bot${TOKEN}`

// ─── Enviar mensaje simple ───────────────────────────────
export const sendMessage = async (chatId, text, extra = {}) => {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra })
  })
}

// ─── Sesiones en memoria (estado conversacional) ─────────
const sesiones = {}

const getSesion = (chatId) => sesiones[chatId] || {}
const setSesion = (chatId, data) => { sesiones[chatId] = { ...getSesion(chatId), ...data } }
const clearSesion = (chatId) => { sesiones[chatId] = {} }

// ─── Buscar cobrador por chatId de Telegram ──────────────
const getCobrador = async (chatId) => {
  return await User.findOne({ telegramChatId: String(chatId), rol: "COBRADOR", habilitado: true })
}

// ─── WEBHOOK PRINCIPAL ───────────────────────────────────
export const handleWebhook = async (req, res) => {
  res.sendStatus(200) // Responder rápido a Telegram

  const body = req.body
  const message = body.message || body.callback_query?.message
  const chatId = message?.chat?.id
  const text = body.message?.text?.trim()
  const callbackData = body.callback_query?.data
  const callbackId = body.callback_query?.id

  if (!chatId) return

  // ─── CALLBACK BUTTONS ─────────────────────────────────
  if (callbackData) {
    await handleCallback(chatId, callbackData, callbackId)
    return
  }

  if (!text) return

  const sesion = getSesion(chatId)

  // ─── COMANDOS PRINCIPALES ────────────────────────────
  if (text.startsWith("/start")) {
    await handleStart(chatId, text)
    return
  }

  if (text === "/menu" || text === "🏠 Menú") {
    await handleMenu(chatId)
    return
  }

  if (text === "/cancelar" || text === "❌ Cancelar") {
    clearSesion(chatId)
    await sendMessage(chatId, "Operación cancelada.")
    await handleMenu(chatId)
    return
  }

  // ─── FLUJOS CONVERSACIONALES ─────────────────────────
  if (sesion.paso) {
    await handlePaso(chatId, text, sesion)
    return
  }

  // ─── MENÚ POR TEXTO ──────────────────────────────────
  if (text === "👤 Crear Cliente") { await iniciarCrearCliente(chatId); return }
  if (text === "💰 Crear Crédito") { await iniciarCrearCredito(chatId); return }
  if (text === "🔍 Consultar Cliente") { await iniciarConsultar(chatId); return }
  if (text === "💳 Registrar Pago") { await iniciarPago(chatId); return }

  await sendMessage(chatId, 'No entendí ese comando. Escribe /menu para ver las opciones.')
}

// ─── /start con token de vinculación ─────────────────────
const handleStart = async (chatId, text) => {
  const partes = text.split(" ")
  const tokenAcceso = partes[1]

  if (!tokenAcceso) {
    await sendMessage(chatId, "👋 Hola. Necesitas un token de acceso para vincularte.\n\nPide a tu administrador que te genere uno desde el panel web.")
    return
  }

  const cobrador = await User.findOne({ telegramToken: tokenAcceso, rol: "COBRADOR" })

  if (!cobrador) {
    await sendMessage(chatId, "❌ Token inválido o ya fue usado.")
    return
  }

  cobrador.telegramChatId = String(chatId)
  cobrador.telegramToken = null
  await cobrador.save()

  await sendMessage(chatId, `✅ ¡Bienvenido ${cobrador.nombre}! Ya estás vinculado.\n\nEscribe /menu para comenzar.`)
  await handleMenu(chatId)
}

// ─── Menú principal ───────────────────────────────────────
const handleMenu = async (chatId) => {
  const cobrador = await getCobrador(chatId)
  if (!cobrador) {
    await sendMessage(chatId, "⚠️ No estás vinculado. Pide tu token al administrador.")
    return
  }

  await sendMessage(chatId, `Hola <b>${cobrador.nombre}</b> 👋\n¿Qué quieres hacer?`, {
    reply_markup: {
      keyboard: [
        [{ text: "👤 Crear Cliente" }, { text: "💰 Crear Crédito" }],
        [{ text: "🔍 Consultar Cliente" }, { text: "💳 Registrar Pago" }]
      ],
      resize_keyboard: true
    }
  })
}

// ─── CREAR CLIENTE ────────────────────────────────────────
const iniciarCrearCliente = async (chatId) => {
  const cobrador = await getCobrador(chatId)
  if (!cobrador) { await sendMessage(chatId, "⚠️ No estás vinculado."); return }

  setSesion(chatId, { paso: "cliente_nombre", cobradorId: cobrador._id, officeId: cobrador.officeId })
  await sendMessage(chatId, "👤 <b>Nuevo Cliente</b>\n\nEscribe el <b>nombre completo</b> del cliente:")
}

// ─── CREAR CRÉDITO ────────────────────────────────────────
const iniciarCrearCredito = async (chatId) => {
  const cobrador = await getCobrador(chatId)
  if (!cobrador) { await sendMessage(chatId, "⚠️ No estás vinculado."); return }

  const clientes = await Cliente.find({ cobrador: cobrador._id, officeId: cobrador.officeId })

  if (clientes.length === 0) {
    await sendMessage(chatId, "No tienes clientes aún. Primero crea un cliente.")
    return
  }

  const botones = clientes.map(c => [{ text: c.nombre, callback_data: `credito_cliente_${c._id}` }])

  await sendMessage(chatId, "💰 <b>Nuevo Crédito</b>\n\nSelecciona el cliente:", {
    reply_markup: { inline_keyboard: botones }
  })
}

// ─── CONSULTAR CLIENTE ────────────────────────────────────
const iniciarConsultar = async (chatId) => {
  const cobrador = await getCobrador(chatId)
  if (!cobrador) { await sendMessage(chatId, "⚠️ No estás vinculado."); return }

  const clientes = await Cliente.find({ cobrador: cobrador._id, officeId: cobrador.officeId })

  if (clientes.length === 0) {
    await sendMessage(chatId, "No tienes clientes aún.")
    return
  }

  const botones = clientes.map(c => [{ text: c.nombre, callback_data: `consultar_${c._id}` }])

  await sendMessage(chatId, "🔍 <b>Consultar Cliente</b>\n\nSelecciona el cliente:", {
    reply_markup: { inline_keyboard: botones }
  })
}

// ─── REGISTRAR PAGO ───────────────────────────────────────
const iniciarPago = async (chatId) => {
  const cobrador = await getCobrador(chatId)
  if (!cobrador) { await sendMessage(chatId, "⚠️ No estás vinculado."); return }

  const creditos = await Credito.find({
    cobradorId: cobrador._id,
    officeId: cobrador.officeId,
    estado: "PENDIENTE"
  }).populate("clienteId", "nombre")

  if (creditos.length === 0) {
    await sendMessage(chatId, "No tienes créditos pendientes.")
    return
  }

  const botones = creditos.map(c => [{
    text: `${c.clienteId?.nombre} — Saldo: $${c.saldoPendiente}`,
    callback_data: `pago_credito_${c._id}`
  }])

  await sendMessage(chatId, "💳 <b>Registrar Pago</b>\n\nSelecciona el crédito:", {
    reply_markup: { inline_keyboard: botones }
  })
}

// ─── CALLBACKS (botones inline) ──────────────────────────
const handleCallback = async (chatId, data, callbackId) => {
  // Seleccionó cliente para crédito
  if (data.startsWith("credito_cliente_")) {
    const clienteId = data.replace("credito_cliente_", "")
    setSesion(chatId, { paso: "credito_monto", clienteId })
    await sendMessage(chatId, "💵 Escribe el <b>monto a prestar</b> (solo números):")
    return
  }

  // Consultar cliente
  if (data.startsWith("consultar_")) {
    const clienteId = data.replace("consultar_", "")
    const cliente = await Cliente.findById(clienteId)
    const creditos = await Credito.find({ clienteId, estado: "PENDIENTE" })
    const saldoTotal = creditos.reduce((acc, c) => acc + c.saldoPendiente, 0)

    await sendMessage(chatId,
      `👤 <b>${cliente.nombre}</b>\n` +
      `📋 Cédula: ${cliente.cedula}\n` +
      `📞 Tel: ${cliente.telefono || "N/A"}\n` +
      `📍 Dir: ${cliente.direccion || "N/A"}\n\n` +
      `💰 Créditos pendientes: ${creditos.length}\n` +
      `💳 Saldo total: <b>$${saldoTotal}</b>`
    )
    return
  }

  // Seleccionó crédito para pago
  if (data.startsWith("pago_credito_")) {
    const creditoId = data.replace("pago_credito_", "")
    setSesion(chatId, { paso: "pago_monto", creditoId })
    await sendMessage(chatId, "💵 Escribe el <b>monto del abono</b>:")
    return
  }
}

// ─── MANEJO DE PASOS CONVERSACIONALES ───────────────────
const handlePaso = async (chatId, text, sesion) => {
  const cobrador = await getCobrador(chatId)
  if (!cobrador) return

  // ── CREAR CLIENTE ──
  if (sesion.paso === "cliente_nombre") {
    setSesion(chatId, { paso: "cliente_cedula", nombre: text })
    await sendMessage(chatId, "📋 Escribe la <b>cédula</b>:")
    return
  }

  if (sesion.paso === "cliente_cedula") {
    setSesion(chatId, { paso: "cliente_telefono", cedula: text })
    await sendMessage(chatId, "📞 Escribe el <b>teléfono</b> (o escribe - para omitir):")
    return
  }

  if (sesion.paso === "cliente_telefono") {
    setSesion(chatId, { paso: "cliente_direccion", telefono: text === "-" ? "" : text })
    await sendMessage(chatId, "📍 Escribe la <b>dirección</b> (o escribe - para omitir):")
    return
  }

  if (sesion.paso === "cliente_direccion") {
    const s = getSesion(chatId)
    try {
      await Cliente.create({
        nombre: s.nombre,
        cedula: s.cedula,
        telefono: s.telefono,
        direccion: text === "-" ? "" : text,
        cobrador: cobrador._id,
        officeId: cobrador.officeId
      })
      clearSesion(chatId)
      await sendMessage(chatId, `✅ Cliente <b>${s.nombre}</b> creado correctamente.`)
      await handleMenu(chatId)
    } catch (err) {
      clearSesion(chatId)
      await sendMessage(chatId, "❌ Error creando cliente. ¿La cédula ya existe?")
      await handleMenu(chatId)
    }
    return
  }

  // ── CREAR CRÉDITO ──
  if (sesion.paso === "credito_monto") {
    const monto = Number(text)
    if (isNaN(monto) || monto <= 0) {
      await sendMessage(chatId, "❌ Monto inválido. Escribe solo números:")
      return
    }
    const montoAPagar = monto * 1.30
    setSesion(chatId, { paso: "credito_fecha", montoPrestamo: monto, montoAPagar })
    await sendMessage(chatId, `📅 Monto a pagar con 30% de interés: <b>$${montoAPagar.toFixed(0)}</b>\n\nEscribe la <b>fecha de pago</b> (YYYY-MM-DD):`)
    return
  }

  if (sesion.paso === "credito_fecha") {
    const s = getSesion(chatId)
    const fecha = new Date(text)
    if (isNaN(fecha)) {
      await sendMessage(chatId, "❌ Fecha inválida. Usa el formato YYYY-MM-DD:")
      return
    }

    const pendiente = await Credito.findOne({ clienteId: s.clienteId, estado: "PENDIENTE" })
    if (pendiente) {
      clearSesion(chatId)
      await sendMessage(chatId, "❌ Este cliente ya tiene un crédito pendiente.")
      await handleMenu(chatId)
      return
    }

    try {
      await Credito.create({
        clienteId: s.clienteId,
        cobradorId: cobrador._id,
        officeId: cobrador.officeId,
        montoPrestamo: s.montoPrestamo,
        montoAPagar: s.montoAPagar,
        saldoPendiente: s.montoAPagar,
        fechaPago: fecha,
        abonos: []
      })
      clearSesion(chatId)
      await sendMessage(chatId, `✅ Crédito de <b>$${s.montoPrestamo}</b> creado correctamente.`)
      await handleMenu(chatId)
    } catch (err) {
      clearSesion(chatId)
      await sendMessage(chatId, "❌ Error creando crédito.")
      await handleMenu(chatId)
    }
    return
  }

  // ── REGISTRAR PAGO ──
  if (sesion.paso === "pago_monto") {
    const monto = Number(text)
    if (isNaN(monto) || monto <= 0) {
      await sendMessage(chatId, "❌ Monto inválido. Escribe solo números:")
      return
    }

    const credito = await Credito.findById(sesion.creditoId).populate("clienteId", "nombre")

    if (!credito || credito.estado === "PAGADO") {
      clearSesion(chatId)
      await sendMessage(chatId, "❌ Crédito no encontrado o ya pagado.")
      await handleMenu(chatId)
      return
    }

    if (monto > credito.saldoPendiente) {
      await sendMessage(chatId, `❌ El abono no puede superar el saldo pendiente ($${credito.saldoPendiente}):`)
      return
    }

    credito.saldoPendiente -= monto
    credito.abonos.push({ monto, fecha: new Date() })
    if (credito.saldoPendiente === 0) credito.estado = "PAGADO"
    await credito.save()

    clearSesion(chatId)
    await sendMessage(chatId,
      `✅ Abono de <b>$${monto}</b> registrado.\n` +
      `👤 Cliente: ${credito.clienteId?.nombre}\n` +
      `💳 Saldo restante: <b>$${credito.saldoPendiente}</b>\n` +
      `${credito.estado === "PAGADO" ? "🎉 ¡Crédito completamente pagado!" : ""}`
    )
    await handleMenu(chatId)
    return
  }
}