import type { ReceiptData } from './types'
import { composeTicketLines } from './ticketFormat'

const ESC = 0x1b
const GS = 0x1d

function textToBytes(text: string): number[] {
  // CP437/latin1 de 1 byte por carácter — la mayoría de impresoras ESC/POS
  // económicas no interpretan UTF-8 correctamente. ticketFormat ya quita
  // acentos, así que esto cubre el resto del rango ASCII/latin1.
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    bytes.push(code < 256 ? code : 0x3f)
  }
  return bytes
}

export function buildEscPosTicket(data: ReceiptData, paperWidth: '58mm' | '80mm'): Uint8Array {
  const cols = paperWidth === '58mm' ? 32 : 48
  const lines = composeTicketLines(data, cols)

  const bytes: number[] = []
  bytes.push(ESC, 0x40) // init
  bytes.push(ESC, 0x61, 0x00) // align left

  for (const line of lines) {
    bytes.push(...textToBytes(line), 0x0a)
  }

  bytes.push(0x0a, 0x0a, 0x0a)
  bytes.push(GS, 0x56, 0x00) // corte total

  return new Uint8Array(bytes)
}
