import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "cookie_consent_accepted";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-5">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 md:p-5">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Мы используем файлы cookie и обрабатываем персональные данные для улучшения работы сайта. Продолжая использование сайта, вы соглашаетесь с нашей{" "}
            <Link href="/privacy-policy" className="text-primary hover:underline font-medium">
              политикой конфиденциальности
            </Link>
            .
          </p>
        </div>
        <Button
          onClick={accept}
          size="sm"
          className="shrink-0 w-full sm:w-auto"
          data-testid="button-cookie-accept"
        >
          Принять
        </Button>
      </div>
    </div>
  );
}
