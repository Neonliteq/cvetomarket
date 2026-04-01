import { useEffect } from "react";
import { useLocation } from "wouter";

export default function PaymentSuccess() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/account?payment=success", { replace: true });
  }, [navigate]);

  return null;
}
