import crypto from "crypto";

const ROBOKASSA_BASE_URL = "https://auth.robokassa.ru/Merchant/Index.aspx";

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

function getConfig() {
  const login = process.env.ROBOKASSA_LOGIN;
  const password1 = process.env.ROBOKASSA_PASSWORD1;
  const password2 = process.env.ROBOKASSA_PASSWORD2;
  const isTest = process.env.ROBOKASSA_TEST === "true" ? 1 : 0;
  return { login, password1, password2, isTest };
}

export function isRobokassaConfigured(): boolean {
  const { login, password1, password2 } = getConfig();
  return !!(login && password1 && password2);
}

export function buildPaymentUrl(params: {
  account: string | number;
  sum: number;
  desc: string;
  email?: string;
}): string {
  const { login, password1, isTest } = getConfig();
  const invId = Number(params.account);
  const outSum = params.sum.toFixed(2);
  const desc = params.desc.slice(0, 100);

  const sig = md5(`${login}:${outSum}:${invId}:${password1}`);

  const url = new URL(ROBOKASSA_BASE_URL);
  url.searchParams.set("MrchLogin", login!);
  url.searchParams.set("OutSum", outSum);
  url.searchParams.set("InvId", String(invId));
  url.searchParams.set("Description", desc);
  url.searchParams.set("SignatureValue", sig);
  url.searchParams.set("IsTest", String(isTest));
  if (params.email) url.searchParams.set("Email", params.email);

  return url.toString();
}

export function verifyResultSignature(outSum: string, invId: string, signatureValue: string): boolean {
  const { password2 } = getConfig();
  const expected = md5(`${outSum}:${invId}:${password2}`);
  return expected.toLowerCase() === signatureValue.toLowerCase();
}
