import crypto from "crypto";

const ROBOKASSA_URL = "https://auth.robokassa.ru/Merchant/Index.aspx";

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

function getConfig() {
  const login = process.env.ROBOKASSA_LOGIN;
  const pass1 = process.env.ROBOKASSA_PASSWORD1;
  const pass2 = process.env.ROBOKASSA_PASSWORD2;
  const isTest = process.env.ROBOKASSA_IS_TEST !== "0";
  return { login, pass1, pass2, isTest };
}

export function isRobokassaConfigured(): boolean {
  const { login, pass1, pass2 } = getConfig();
  return !!(login && pass1 && pass2);
}

export function buildPaymentUrl(params: {
  outSum: number;
  invId: number;
  description: string;
  email?: string;
}): string {
  const { login, pass1, isTest } = getConfig();
  const outSum = params.outSum.toFixed(2);
  const invId = params.invId;
  const sig = md5(`${login}:${outSum}:${invId}:${pass1}`);

  const url = new URL(ROBOKASSA_URL);
  url.searchParams.set("MerchantLogin", login!);
  url.searchParams.set("OutSum", outSum);
  url.searchParams.set("InvId", String(invId));
  url.searchParams.set("Description", params.description.slice(0, 100));
  url.searchParams.set("SignatureValue", sig);
  url.searchParams.set("IsTest", isTest ? "1" : "0");
  url.searchParams.set("Culture", "ru");
  url.searchParams.set("Encoding", "utf-8");
  if (params.email) url.searchParams.set("Email", params.email);
  return url.toString();
}

export function verifyResultSignature(body: {
  OutSum: string;
  InvId: string;
  SignatureValue: string;
}): boolean {
  const { pass2 } = getConfig();
  const expected = md5(`${body.OutSum}:${body.InvId}:${pass2}`).toUpperCase();
  return body.SignatureValue.toUpperCase() === expected;
}
