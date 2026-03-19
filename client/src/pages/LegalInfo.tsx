import { Building2, FileText, Scale, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 py-2.5 border-b border-border last:border-0">
    <span className="text-muted-foreground text-sm sm:w-48 shrink-0">{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

export default function LegalInfo() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Юридическая информация</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Сведения об операторе платформы ЦветоМаркет, необходимые для взаимодействия с контрагентами и пользователями.
        </p>
      </div>

      {/* Реквизиты */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Реквизиты организации
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Полное наименование" value='Общество с ограниченной ответственностью «Зеор»' />
          <InfoRow label="Сокращённое наименование" value="ООО «Зеор»" />
          <InfoRow label="Организационно-правовая форма" value="Общество с ограниченной ответственностью" />
          <InfoRow label="ИНН" value="3900018310" />
          <InfoRow label="КПП" value="390001001" />
          <InfoRow label="ОГРН" value="1233900013126" />
          <InfoRow label="ОКПО" value="71092537" />
          <InfoRow label="Дата регистрации" value="21 ноября 2023 г." />
          <InfoRow label="Юридический адрес" value="236022, Калининградская область, г. Калининград, тер. СНТ Радуга (ул. Лейтенанта Катина), пер. Вильямса, д. 4" />
          <InfoRow label="Руководитель" value="Аршинская Елена Анатольевна (Директор)" />
          <InfoRow label="ОКВЭД" value="47.76 — Торговля розничная цветами и другими растениями" />
        </CardContent>
      </Card>

      <Separator />

      {/* Правовой статус */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Правовой статус платформы</h2>
        </div>
        <div className="pl-12 space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>ООО «Зеор» осуществляет деятельность в качестве информационного посредника, обеспечивающего взаимодействие между продавцами (цветочными магазинами) и покупателями посредством маркетплейса ЦветоМаркет.</p>
          <p>Платформа не является стороной договора купли-продажи, заключаемого между покупателем и продавцом. Ответственность за качество товаров, своевременность доставки и исполнение обязательств по договору несёт продавец.</p>
          <p>Деятельность платформы осуществляется в соответствии с:</p>
          <ul className="list-disc ml-5 space-y-1 mt-1">
            <li>Гражданским кодексом Российской Федерации</li>
            <li>Федеральным законом № 149-ФЗ «Об информации, информационных технологиях и о защите информации»</li>
            <li>Федеральным законом № 152-ФЗ «О персональных данных»</li>
            <li>Законом РФ № 2300-1 «О защите прав потребителей»</li>
            <li>Федеральным законом № 54-ФЗ «О применении контрольно-кассовой техники»</li>
          </ul>
        </div>
      </div>

      <Separator />

      {/* Претензии */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Порядок направления претензий</h2>
        </div>
        <div className="pl-12 space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>Претензии в адрес ООО «Зеор» принимаются в письменном виде:</p>
          <ul className="list-disc ml-5 space-y-1 mt-1">
            <li>По электронной почте: <span className="text-foreground font-medium">neonliteq@ya.ru</span></li>
            <li>Через встроенную систему обратной связи на платформе</li>
          </ul>
          <p className="mt-2">Срок рассмотрения претензии — 30 календарных дней с момента её получения. По результатам рассмотрения заявителю направляется мотивированный ответ.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-4">
        <Link href="/terms-of-use">
          <Button variant="outline" data-testid="button-legal-to-terms">Условия использования</Button>
        </Link>
        <Link href="/privacy-policy">
          <Button variant="outline" data-testid="button-legal-to-privacy">Политика конфиденциальности</Button>
        </Link>
      </div>
    </div>
  );
}
