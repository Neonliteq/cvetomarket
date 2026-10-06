import { useEffect } from "react";
import { useLocation } from "wouter";
import { metrikaGoal } from "@/lib/analytics";

export default function PaymentSuccess() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Оплата прошла — фиксируем цель в Яндекс.Метрике (воронка до оплаты).
    metrikaGoal("payment_success");
    navigate("/account?payment=success", { replace: true });
  }, [navigate]);

  return null;
}
