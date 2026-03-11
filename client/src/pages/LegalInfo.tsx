import { Building2, FileText, Scale, MapPin, Phone, Mail, CreditCard, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
          <InfoRow label="Полное наименование" value='Общество с ограниченной ответственностью «ЦветоМаркет»' />
          <InfoRow label="Краткое наименование" value='ООО «ЦветоМаркет»' />
          <InfoRow label="ОГРН" value="1237700000001" />
          <InfoRow label="ИНН" value="7700000001" />
          <InfoRow label="КПП" value="770001001" />
          <InfoRow label="ОКПО" value="12345678" />
          <InfoRow label="ОКВЭД" value="47.76 — Торговля розничная цветами и другими растениями" />
          <InfoRow label="Дата регистрации" value="15 марта 2024 г." />
          <InfoRow label="Регистрирующий орган" value="МИФНС России № 46 по г. Москве" />
        </CardContent>
      </Card>

      {/* Адреса */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Адреса
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Юридический адрес" value="125009, г. Москва, ул. Тверская, д. 1, офис 100" />
          <InfoRow label="Фактический адрес" value="125009, г. Москва, ул. Тверская, д. 1, офис 100" />
          <InfoRow label="Почтовый адрес" value="125009, г. Москва, ул. Тверская, д. 1" />
        </CardContent>
      </Card>

      {/* Банковские реквизиты */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Банковские реквизиты
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Банк" value="ПАО «Сбербанк России»" />
          <InfoRow label="БИК" value="044525225" />
          <InfoRow label="Расчётный счёт" value="40702810000000000001" />
          <InfoRow label="Корреспондентский счёт" value="30101810400000000225" />
        </CardContent>
      </Card>

      {/* Контакты */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Контактные данные
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Телефон" value="+7 (495) 000-00-00" />
          <InfoRow label="Электронная почта" value="legal@tsvetomarket.ru" />
          <InfoRow label="Сайт" value="tsvetomarket.ru" />
          <InfoRow label="Режим работы" value="Пн–Пт с 9:00 до 18:00 (МСК)" />
        </CardContent>
      </Card>

      <Separator />

      {/* Лицензии и сертификаты */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Разрешительные документы</h2>
        </div>
        <div className="pl-12 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5 shrink-0">Роскомнадзор</Badge>
            <p>ООО «ЦветоМаркет» зарегистрировано в реестре операторов персональных данных Роскомнадзора. Регистрационный номер: <span className="font-medium text-foreground">77-0000001</span></p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5 shrink-0">ОФД</Badge>
            <p>Передача фискальных данных осуществляется через аккредитованного оператора фискальных данных в соответствии с требованиями Федерального закона № 54-ФЗ.</p>
          </div>
        </div>
      </div>

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
          <p>ООО «ЦветоМаркет» осуществляет деятельность в качестве информационного посредника, обеспечивающего взаимодействие между продавцами (цветочными магазинами) и покупателями посредством маркетплейса.</p>
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
          <p>Претензии в адрес ООО «ЦветоМаркет» принимаются в письменном виде:</p>
          <ul className="list-disc ml-5 space-y-1 mt-1">
            <li>По электронной почте: <span className="text-foreground font-medium">legal@tsvetomarket.ru</span></li>
            <li>По почтовому адресу: 125009, г. Москва, ул. Тверская, д. 1</li>
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
