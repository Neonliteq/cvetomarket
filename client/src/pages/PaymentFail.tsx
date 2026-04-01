import { useEffect } from "react";
import { useLocation } from "wouter";

export default function PaymentFail() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/account?payment=failed", { replace: true });
  }, [navigate]);

  return null;
}
