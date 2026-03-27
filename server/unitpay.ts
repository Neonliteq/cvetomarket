import crypto from "crypto";

const UNITPAY_BASE_URL = "https://unitpay.ru/pay";

function sha256(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function getConfig() {
  const publicKey = process.env.UNITPAY_PUBLIC_KEY;
  const secretKey = process.env.UNITPAY_SECRET_KEY;
  return { publicKey, secretKey };
}

export function isUnitpayConfigured(): boolean {
  const { publicKey, secretKey } = getConfig();
  return !!(publicKey && secretKey);
}

export function buildPaymentUrl(params: {
  account: string | number;
  sum: number;
  desc: string;
  email?: string;
  currency?: string;
}): string {
  const { publicKey, secretKey } = getConfig();
  const account = String(params.account);
  const sum = params.sum.toFixed(2);
  const desc = params.desc.slice(0, 255);
  const currency = params.currency || "RUB";

  const sig = sha256(
    `${account}{up}${currency}{up}${desc}{up}${sum}{up}${secretKey}`
  );

  const url = new URL(`${UNITPAY_BASE_URL}/${publicKey}`);
  url.searchParams.set("account", account);
  url.searchParams.set("sum", sum);
  url.searchParams.set("desc", desc);
  url.searchParams.set("currency", currency);
  url.searchParams.set("signature", sig);
  if (params.email) url.searchParams.set("customerEmail", params.email);

  return url.toString();
}

export function verifyHandlerSignature(
  method: string,
  params: Record<string, string>
): boolean {
  const { secretKey } = getConfig();
  const { account, currency, desc, sum, signature } = params;
  if (!signature) return false;

  const expected = sha256(
    `${account}{up}${currency}{up}${desc}{up}${sum}{up}${secretKey}`
  );
  return signature === expected;
}
