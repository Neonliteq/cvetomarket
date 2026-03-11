import { Truck, CreditCard, Clock, MapPin, ShieldCheck, Phone, Banknote, Package, Flower2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
    {children}
  </div>
);

const InfoCard = ({ icon: Icon, title, description, badge }: { icon: any; title: string; description: string; badge?: string }) => (
  <Card>
    <CardContent className="p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">{title}</p>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </CardContent>
  </Card>
);

export default function DeliveryAndPayment() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Truck className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Доставка и оплата</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Узнайте всё о доставке цветов и способах оплаты на ЦветоМаркет
        </p>
      </div>

      <Separator />

      {/* Delivery */}
      <Section icon={Truck} title="Доставка">
        <p className="text-sm text-muted-foreground">
          Каждый магазин на ЦветоМаркет самостоятельно осуществляет доставку в своей зоне. Условия и стоимость доставки указаны на странице каждого магазина.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard
            icon={Clock}
            title="Время доставки"
            description="Курьер доставит заказ в выбранный вами временной интервал: утром, днём или вечером."
          />
          <InfoCard
            icon={MapPin}
            title="Зона доставки"
            description="Каждый магазин указывает свою зону доставки. Система автоматически проверяет, попадает ли ваш адрес в зону."
          />
          <InfoCard
            icon={Package}
            title="Бережная упаковка"
            description="Букеты тщательно упаковываются флористами, чтобы цветы сохранили свежесть при доставке."
          />
          <InfoCard
            icon={Flower2}
            title="Фото перед доставкой"
            description="Перед отправкой магазин присылает фото готового букета для вашего одобрения."
            badge="Гарантия качества"
          />
        </div>
      </Section>

      <Separator />

      {/* Delivery cost */}
      <Section icon={MapPin} title="Стоимость доставки">
        <p className="text-sm text-muted-foreground">
          Стоимость доставки определяется каждым магазином индивидуально — в зависимости от расстояния и зоны. Точная стоимость отображается в корзине при оформлении заказа.
        </p>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <p className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Как узнать стоимость доставки?
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5 ml-6 list-disc">
              <li>Добавьте товары в корзину и перейдите к оформлению</li>
              <li>Введите адрес доставки — система рассчитает стоимость автоматически</li>
              <li>Стоимость доставки для каждого магазина видна на его странице</li>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Separator />

      {/* Timeslots */}
      <Section icon={Clock} title="Временны́е слоты доставки">
        <p className="text-sm text-muted-foreground">
          При оформлении заказа вы выбираете удобный временной интервал доставки. Магазин постарается доставить букет в указанное время.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { slot: "09:00–12:00", label: "Утро" },
            { slot: "12:00–15:00", label: "День" },
            { slot: "15:00–18:00", label: "Вечер" },
            { slot: "18:00–21:00", label: "Поздний вечер" },
          ].map((s) => (
            <Card key={s.slot}>
              <CardContent className="p-3 text-center">
                <p className="font-semibold text-sm">{s.slot}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          * Точные временны́е слоты могут различаться у разных магазинов в зависимости от их режима работы.
        </p>
      </Section>

      <Separator />

      {/* Payment */}
      <Section icon={CreditCard} title="Способы оплаты">
        <p className="text-sm text-muted-foreground">
          На ЦветоМаркет доступны два способа оплаты — выберите удобный при оформлении заказа.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="border-primary/20">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Банковская карта</p>
                  <Badge variant="default" className="text-xs mt-0.5">Онлайн</Badge>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />Visa, Mastercard, МИР</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />Безопасная оплата</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />Оплата при оформлении заказа</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Наличными</p>
                  <Badge variant="secondary" className="text-xs mt-0.5">При получении</Badge>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />Оплата курьеру при доставке</li>
                <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />Приготовьте точную сумму</li>
                <li className="flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />Доступно не во всех магазинах</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Separator />

      {/* Order flow */}
      <Section icon={ShieldCheck} title="Как проходит заказ">
        <div className="space-y-3">
          {[
            { step: 1, title: "Оформление", desc: "Выбираете товары, указываете адрес доставки и время, выбираете способ оплаты" },
            { step: 2, title: "Подтверждение", desc: "Магазин принимает заказ и начинает сборку букета" },
            { step: 3, title: "Фото букета", desc: "Перед отправкой вы получаете фото готового букета и подтверждаете его" },
            { step: 4, title: "Доставка", desc: "Курьер доставляет букет по указанному адресу в выбранный временной интервал" },
            { step: 5, title: "Отзыв", desc: "После получения можете оставить отзыв и оценку магазину" },
          ].map((s, i, arr) => (
            <div key={s.step} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">
                  {s.step}
                </div>
                {i < arr.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
              </div>
              <div className="pb-4">
                <p className="font-semibold text-sm">{s.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      {/* Cancellation */}
      <Section icon={AlertCircle} title="Отмена и возврат">
        <div className="space-y-3">
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold text-sm text-amber-700 dark:text-amber-400">Условия отмены заказа</p>
              <ul className="text-sm text-muted-foreground space-y-1.5 ml-1">
                <li className="flex items-start gap-2"><span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />Заказ можно отменить до начала сборки</li>
                <li className="flex items-start gap-2"><span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />После подтверждения фото букета заказ не подлежит отмене</li>
                <li className="flex items-start gap-2"><span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />При проблемах с качеством — обратитесь к магазину через чат</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Separator />

      {/* Contact */}
      <Section icon={Phone} title="Остались вопросы?">
        <p className="text-sm text-muted-foreground">
          По всем вопросам о доставке и оплате вы можете написать напрямую в магазин через встроенный чат на странице товара или заказа.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/catalog">
            <Button data-testid="button-goto-catalog">Перейти в каталог</Button>
          </Link>
          <Link href="/shops">
            <Button variant="outline" data-testid="button-goto-shops">Выбрать магазин</Button>
          </Link>
        </div>
      </Section>
    </div>
  );
}
