import { ShieldCheck, Database, Eye, Lock, UserCheck, FileText, Phone, Scale, Trash2, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground space-y-2 leading-relaxed pl-12">
      {children}
    </div>
  </div>
);

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Политика обработки персональных данных</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Настоящая Политика описывает, какие персональные данные мы собираем, как и зачем используем, а также как обеспечиваем их защиту.
        </p>
        <p className="text-xs text-muted-foreground">Редакция от 1 января 2026 г.</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm">
          Обработка персональных данных осуществляется в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» и иными актами законодательства Российской Федерации. Используя платформу ЦветоМаркет, вы выражаете согласие на обработку ваших персональных данных в соответствии с настоящей Политикой.
        </CardContent>
      </Card>

      <Separator />

      <Section icon={FileText} title="1. Оператор персональных данных">
        <p>Оператором персональных данных является платформа ЦветоМаркет (далее — «Оператор», «мы»). Оператор самостоятельно определяет цели и способы обработки персональных данных пользователей.</p>
        <p>По всем вопросам, связанным с обработкой персональных данных, вы можете обратиться через встроенную систему обратной связи на платформе.</p>
      </Section>

      <Separator />

      <Section icon={Database} title="2. Какие данные мы собираем">
        <p>В зависимости от типа аккаунта мы можем собирать следующие данные:</p>
        <p className="font-medium text-foreground mt-2">Для всех пользователей:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Адрес электронной почты</li>
          <li>Имя (указанное при регистрации)</li>
          <li>Номер телефона (при указании)</li>
          <li>Аватар (при загрузке)</li>
          <li>Дата регистрации</li>
        </ul>
        <p className="font-medium text-foreground mt-3">Для покупателей дополнительно:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Адрес доставки</li>
          <li>Имя и телефон получателя заказа</li>
          <li>История заказов и отзывов</li>
        </ul>
        <p className="font-medium text-foreground mt-3">Для владельцев магазинов дополнительно:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Наименование и адрес магазина</li>
          <li>ИНН, ОГРН, юридическое наименование и адрес</li>
          <li>Контактные данные магазина (телефон, e-mail)</li>
          <li>Банковские реквизиты для выплат</li>
          <li>Фотографии товаров и логотип магазина</li>
        </ul>
        <p className="font-medium text-foreground mt-3">Технические данные (собираются автоматически):</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>IP-адрес</li>
          <li>Данные о браузере и устройстве</li>
          <li>Файлы cookie</li>
          <li>История действий на платформе</li>
        </ul>
      </Section>

      <Separator />

      <Section icon={Eye} title="3. Цели обработки данных">
        <p>Мы обрабатываем персональные данные в следующих целях:</p>
        <ul className="list-disc ml-5 space-y-1.5">
          <li>Регистрация и идентификация пользователей на платформе</li>
          <li>Обработка и выполнение заказов, организация доставки</li>
          <li>Обеспечение связи между покупателями и продавцами</li>
          <li>Направление уведомлений о статусах заказов</li>
          <li>Расчёт и начисление комиссий продавцам</li>
          <li>Предотвращение мошенничества и обеспечение безопасности</li>
          <li>Улучшение качества работы платформы и пользовательского опыта</li>
          <li>Исполнение требований законодательства Российской Федерации</li>
        </ul>
      </Section>

      <Separator />

      <Section icon={Lock} title="4. Правовые основания обработки">
        <p>Обработка персональных данных осуществляется на следующих правовых основаниях:</p>
        <ul className="list-disc ml-5 space-y-1.5">
          <li><span className="font-medium text-foreground">Согласие субъекта</span> — при регистрации на платформе вы даёте согласие на обработку данных</li>
          <li><span className="font-medium text-foreground">Исполнение договора</span> — обработка данных, необходимая для выполнения заказа или оказания услуг</li>
          <li><span className="font-medium text-foreground">Законные интересы</span> — обеспечение безопасности, предотвращение мошенничества</li>
          <li><span className="font-medium text-foreground">Юридическое обязательство</span> — исполнение требований законодательства</li>
        </ul>
      </Section>

      <Separator />

      <Section icon={FileText} title="5. Передача данных третьим лицам">
        <p>Мы не продаём и не передаём ваши персональные данные третьим лицам, за исключением следующих случаев:</p>
        <ul className="list-disc ml-5 space-y-1.5">
          <li><span className="font-medium text-foreground">Продавцы</span> — получают данные, необходимые для выполнения заказа (имя, телефон и адрес получателя)</li>
          <li><span className="font-medium text-foreground">Платёжные системы</span> — при проведении онлайн-платежей данные обрабатываются платёжным провайдером в соответствии с его политикой конфиденциальности</li>
          <li><span className="font-medium text-foreground">Государственные органы</span> — по законному требованию уполномоченных органов</li>
        </ul>
        <p className="mt-2">Во всех случаях передача данных осуществляется в минимально необходимом объёме и только в целях выполнения конкретной функции.</p>
      </Section>

      <Separator />

      <Section icon={Lock} title="6. Защита данных">
        <p>Мы принимаем организационные и технические меры для защиты ваших персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения:</p>
        <ul className="list-disc ml-5 space-y-1.5">
          <li>Шифрование передаваемых данных (HTTPS)</li>
          <li>Хранение паролей в хэшированном виде (bcrypt)</li>
          <li>Ограничение доступа к данным по принципу минимальных привилегий</li>
          <li>Регулярное резервное копирование данных</li>
          <li>Мониторинг подозрительной активности</li>
        </ul>
      </Section>

      <Separator />

      <Section icon={Bell} title="7. Файлы cookie">
        <p>Платформа использует файлы cookie для обеспечения работы сессий пользователей, запоминания настроек и анализа использования сайта.</p>
        <p>Вы можете отключить cookie в настройках браузера, однако это может повлиять на работу некоторых функций платформы (в частности, невозможна авторизация).</p>
        <p>Мы не используем cookie для показа таргетированной рекламы и не передаём данные cookie рекламным сетям.</p>
      </Section>

      <Separator />

      <Section icon={UserCheck} title="8. Права субъекта персональных данных">
        <p>В соответствии с законодательством РФ вы имеете право:</p>
        <ul className="list-disc ml-5 space-y-1.5">
          <li><span className="font-medium text-foreground">Получить информацию</span> — узнать, какие данные о вас обрабатываются</li>
          <li><span className="font-medium text-foreground">Исправить данные</span> — обновить устаревшие или некорректные данные в личном кабинете</li>
          <li><span className="font-medium text-foreground">Отозвать согласие</span> — в любой момент отозвать согласие на обработку данных</li>
          <li><span className="font-medium text-foreground">Удалить данные</span> — потребовать удаления аккаунта и связанных персональных данных</li>
          <li><span className="font-medium text-foreground">Ограничить обработку</span> — потребовать ограничения обработки ваших данных</li>
          <li><span className="font-medium text-foreground">Подать жалобу</span> — в Роскомнадзор или в суд</li>
        </ul>
        <p className="mt-2">Для реализации своих прав обратитесь через встроенную систему обратной связи на платформе. Мы ответим в течение 30 дней.</p>
      </Section>

      <Separator />

      <Section icon={Trash2} title="9. Сроки хранения данных">
        <p>Мы храним ваши данные в течение следующих сроков:</p>
        <ul className="list-disc ml-5 space-y-1.5">
          <li>Данные аккаунта — в течение всего срока использования платформы и 3 лет после удаления аккаунта</li>
          <li>История заказов — 5 лет (в соответствии с требованиями налогового законодательства)</li>
          <li>Переписка в чате — 1 год с момента последнего сообщения</li>
          <li>Технические логи — 90 дней</li>
        </ul>
        <p className="mt-2">После истечения срока хранения данные удаляются или обезличиваются.</p>
      </Section>

      <Separator />

      <Section icon={Scale} title="10. Изменения политики">
        <p>Мы вправе вносить изменения в настоящую Политику. Актуальная версия всегда доступна на данной странице. О существенных изменениях мы уведомим пользователей по электронной почте или через уведомления в личном кабинете не позднее чем за 7 дней до вступления в силу.</p>
        <p>Продолжение использования платформы после вступления изменений в силу означает ваше согласие с новой редакцией Политики.</p>
      </Section>

      <div className="flex flex-wrap gap-3 pt-4">
        <Link href="/terms-of-use">
          <Button variant="outline" data-testid="button-privacy-to-terms">Условия использования</Button>
        </Link>
        <Link href="/delivery-and-payment">
          <Button variant="outline" data-testid="button-privacy-to-delivery">Доставка и оплата</Button>
        </Link>
      </div>
    </div>
  );
}
