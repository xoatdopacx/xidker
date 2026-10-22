import QRCode from "qrcode";
import { BANKS, type Bank } from "./vietqrBanks";

// VietQR is the EMVCo merchant-presented QR format run by NAPAS. Every Vietnamese banking
// app reads it and fills in the bank, account, amount and transfer memo by itself.

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

/** CRC-16/CCITT-FALSE (poly 0x1021, start 0xFFFF), as EMVCo field 63 requires. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(text, "utf8")) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function bankByBin(bin: string): Bank | null {
  return BANKS.find((bank) => bank.bin === bin) ?? null;
}

/** The text inside the QR code for one transfer of `amount` VND with the given memo. */
export function vietQrPayload(input: { bin: string; accountNumber: string; amount: number; memo: string }): string {
  const beneficiary = field("00", input.bin) + field("01", input.accountNumber);
  const merchant = field("00", "A000000727") + field("01", beneficiary) + field("02", "QRIBFTTA");
  const body =
    field("00", "01") +
    field("01", "12") + // one-off code: amount and memo are fixed
    field("38", merchant) +
    field("53", "704") + // VND
    field("54", String(Math.round(input.amount))) +
    field("58", "VN") +
    field("62", field("08", input.memo));
  return `${body}6304${crc16(`${body}6304`)}`;
}

/** The QR code as an SVG data URL. */
export async function vietQrImage(payload: string): Promise<string> {
  const svg = await QRCode.toString(payload, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#10230f", light: "#ffffff" } });
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/** Strips accents and anything banks may refuse in an account holder name. */
export function bankAccountName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
