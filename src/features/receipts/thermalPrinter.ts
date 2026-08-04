import { buildEscPosTicket } from './escpos'
import type { ReceiptData } from './types'

export type PrinterTransport = 'bluetooth' | 'serial'
export type PaperWidth = '58mm' | '80mm'

export interface PrinterConfig {
  transport: PrinterTransport
  paperWidth: PaperWidth
  deviceName: string
  deviceId?: string
}

const STORAGE_KEY = 'spiderpos-printer-config'

export function getSavedPrinterConfig(): PrinterConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PrinterConfig
  } catch {
    return null
  }
}

export function savePrinterConfig(config: PrinterConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function clearPrinterConfig() {
  localStorage.removeItem(STORAGE_KEY)
}

// Las impresoras térmicas económicas no comparten un UUID de servicio BLE
// estándar; estos son los más comunes en el mercado (genéricos + los que
// usan chips BLE típicos tipo "printer service").
const KNOWN_BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
]

const CHUNK_SIZE = 180

async function writeInChunks(write: (chunk: ArrayBuffer) => Promise<void>, bytes: Uint8Array) {
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    await write(bytes.slice(i, i + CHUNK_SIZE).buffer as ArrayBuffer)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

async function findWritableCharacteristic(
  server: BluetoothRemoteGATTServer,
): Promise<BluetoothRemoteGATTCharacteristic> {
  const services = await server.getPrimaryServices()
  for (const service of services) {
    const characteristics = await service.getCharacteristics()
    const writable = characteristics.find(
      (c) => c.properties.write || c.properties.writeWithoutResponse,
    )
    if (writable) return writable
  }
  throw new Error('La impresora no expone ninguna característica de escritura reconocible')
}

export async function connectBluetoothPrinter(): Promise<PrinterConfig> {
  if (!navigator.bluetooth) {
    throw new Error('Este navegador no soporta Web Bluetooth')
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: KNOWN_BLE_SERVICES,
  })

  const config: PrinterConfig = {
    transport: 'bluetooth',
    paperWidth: '58mm',
    deviceName: device.name ?? 'Impresora Bluetooth',
    deviceId: device.id,
  }
  savePrinterConfig(config)
  return config
}

async function printBluetoothBytes(bytes: Uint8Array, deviceId?: string): Promise<void> {
  if (!navigator.bluetooth) throw new Error('Este navegador no soporta Web Bluetooth')

  let device: BluetoothDevice | undefined
  if (deviceId && navigator.bluetooth.getDevices) {
    const known = await navigator.bluetooth.getDevices()
    device = known.find((d) => d.id === deviceId)
  }
  if (!device) {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_BLE_SERVICES,
    })
  }

  const server = await device.gatt?.connect()
  if (!server) throw new Error('No se pudo conectar a la impresora')

  const characteristic = await findWritableCharacteristic(server)
  await writeInChunks((chunk) => characteristic.writeValueWithoutResponse(chunk), bytes)
  server.disconnect()
}

export async function connectSerialPrinter(): Promise<PrinterConfig> {
  if (!navigator.serial) {
    throw new Error('Este navegador no soporta Web Serial')
  }
  const port = await navigator.serial.requestPort()
  const info = port.getInfo()

  const config: PrinterConfig = {
    transport: 'serial',
    paperWidth: '58mm',
    deviceName: `USB ${info.usbVendorId?.toString(16) ?? ''}:${info.usbProductId?.toString(16) ?? ''}`,
  }
  savePrinterConfig(config)
  return config
}

async function printSerialBytes(bytes: Uint8Array): Promise<void> {
  if (!navigator.serial) throw new Error('Este navegador no soporta Web Serial')

  const ports = await navigator.serial.getPorts()
  const port = ports[0] ?? (await navigator.serial.requestPort())

  await port.open({ baudRate: 9600 })
  const writer = port.writable?.getWriter()
  if (!writer) throw new Error('No se pudo abrir el puerto de la impresora')

  try {
    await writer.write(bytes)
  } finally {
    writer.releaseLock()
    await port.close()
  }
}

export async function printReceipt(data: ReceiptData, config: PrinterConfig): Promise<void> {
  const bytes = buildEscPosTicket(data, config.paperWidth)
  if (config.transport === 'bluetooth') {
    await printBluetoothBytes(bytes, config.deviceId)
  } else {
    await printSerialBytes(bytes)
  }
}

export async function testPrint(config: PrinterConfig): Promise<void> {
  const testData: ReceiptData = {
    saleId: 'test',
    folio: 'TEST0000',
    createdAt: new Date().toISOString(),
    cashierName: 'Prueba',
    customerName: null,
    storeName: 'SpiderPOS',
    storeAddress: null,
    storePhone: null,
    storeLogoUrl: null,
    footerMessage: 'Impresión de prueba exitosa',
    items: [
      {
        name: 'Producto de prueba',
        quantity: 1,
        unitType: 'piece',
        unitPrice: 1,
        discount: 0,
        subtotal: 1,
      },
    ],
    subtotal: 1,
    discount: 0,
    tax: 0,
    total: 1,
    payments: [{ method: 'cash', amount: 1, changeGiven: 0 }],
    isCopy: false,
  }
  await printReceipt(testData, config)
}
