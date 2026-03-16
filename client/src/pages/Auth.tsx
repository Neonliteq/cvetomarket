import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Flower2, Copy, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";
import type { City } from "@shared/schema";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  email: z.string().email("Введите корректный email"),
  phone: z.string().optional(),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  confirmPassword: z.string(),
  role: z.enum(["buyer", "shop"]),
  legalType: z.string().optional(),
  inn: z.string().optional(),
  ogrn: z.string().optional(),
  legalName: z.string().optional(),
  legalAddress: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  cityId: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

const forgotSchema = z.object({
  email: z.string().email("Введите корректный email"),
});

const resetSchema = z.object({
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const resetToken = new URLSearchParams(search).get("resetToken");
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("login");
  const [view, setView] = useState<"tabs" | "forgot" | "forgot-success" | "reset" | "reset-success">(
    resetToken ? "reset" : "tabs"
  );
  const [forgotResult, setForgotResult] = useState<{ hasTelegram: boolean; emailSent?: boolean; resetLink?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (resetToken) setView("reset");
  }, [resetToken]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "", email: "", phone: "", password: "", confirmPassword: "", role: "buyer",
      legalType: "", inn: "", ogrn: "", legalName: "", legalAddress: "", description: "", address: "", cityId: "",
    },
  });

  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const { data: cities } = useQuery<City[]>({ queryKey: ["/api/cities"] });

  const watchRole = registerForm.watch("role");

  const onLogin = async (data: z.infer<typeof loginSchema>) => {
    try {
      const user = await login(data.email, data.password);
      if (user.role === "shop") navigate("/shop-dashboard");
      else if (user.role === "admin") navigate("/admin");
      else navigate("/");
    } catch {
      toast({ title: "Ошибка входа", description: "Неверный email или пароль", variant: "destructive" });
    }
  };

  const onRegister = async (data: z.infer<typeof registerSchema>) => {
    try {
      const { confirmPassword, ...payload } = data;
      await register(payload);
      toast({ title: "Добро пожаловать!", description: "Аккаунт успешно создан" });
      if (data.role === "shop") navigate("/shop-dashboard");
      else navigate("/");
    } catch (err: any) {
      toast({ title: "Ошибка регистрации", description: err?.message || "Попробуйте позже", variant: "destructive" });
    }
  };

  const onForgot = async (data: z.infer<typeof forgotSchema>) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const json = await res.json();
      setForgotResult({ hasTelegram: json.hasTelegram, emailSent: json.emailSent, resetLink: json.resetLink });
      setView("forgot-success");
    } catch {
      toast({ title: "Ошибка", description: "Попробуйте позже", variant: "destructive" });
    }
  };

  const onReset = async (data: z.infer<typeof resetSchema>) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error || "Ошибка", variant: "destructive" });
        return;
      }
      setView("reset-success");
    } catch {
      toast({ title: "Ошибка", description: "Попробуйте позже", variant: "destructive" });
    }
  };

  const handleCopy = () => {
    if (forgotResult?.resetLink) {
      navigator.clipboard.writeText(forgotResult.resetLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary mx-auto flex items-center justify-center mb-4">
            <Flower2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">ЦветоМаркет</h1>
          <p className="text-muted-foreground text-sm mt-1">Маркетплейс цветочных магазинов</p>
        </div>
        <Card>
          <CardContent className="pt-6">

            {/* ── FORGOT PASSWORD FORM ── */}
            {view === "forgot" && (
              <div className="space-y-5">
                <button
                  onClick={() => setView("tabs")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="w-4 h-4" /> Назад
                </button>
                <div>
                  <h2 className="text-lg font-semibold">Восстановление пароля</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Укажите email вашего аккаунта. Ссылка для сброса пароля будет отправлена в Telegram (если он подключён) или показана на экране.
                  </p>
                </div>
                <Form {...forgotForm}>
                  <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
                    <FormField control={forgotForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input {...field} type="email" placeholder="you@example.com" data-testid="input-forgot-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={forgotForm.formState.isSubmitting} data-testid="button-submit-forgot">
                      {forgotForm.formState.isSubmitting ? "Отправляем..." : "Восстановить пароль"}
                    </Button>
                  </form>
                </Form>
              </div>
            )}

            {/* ── FORGOT SUCCESS ── */}
            {view === "forgot-success" && (
              <div className="space-y-5">
                {forgotResult?.emailSent ? (
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Письмо отправлено</h2>
                    <p className="text-sm text-muted-foreground">
                      Мы отправили ссылку для сброса пароля на ваш email. Ссылка действительна 1 час.
                      {forgotResult.hasTelegram && " Также отправили уведомление в Telegram."}
                    </p>
                    <p className="text-xs text-muted-foreground">Не получили письмо? Проверьте папку «Спам».</p>
                  </div>
                ) : forgotResult?.hasTelegram ? (
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Ссылка отправлена</h2>
                    <p className="text-sm text-muted-foreground">
                      Мы отправили ссылку для сброса пароля в ваш Telegram. Ссылка действительна 1 час.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Ссылка для сброса пароля</h2>
                    <p className="text-sm text-muted-foreground">
                      Скопируйте ссылку ниже и перейдите по ней, чтобы установить новый пароль. Ссылка действительна 1 час.
                    </p>
                    {forgotResult?.resetLink && (
                      <div className="relative bg-muted rounded-lg p-3 pr-12 break-all text-xs font-mono" data-testid="text-reset-link">
                        {forgotResult.resetLink}
                        <button
                          onClick={handleCopy}
                          className="absolute right-2 top-2 p-1.5 rounded-md hover:bg-background transition-colors"
                          title="Скопировать"
                          data-testid="button-copy-link"
                        >
                          {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => { setView("tabs"); setTab("login"); }} data-testid="button-back-to-login-after-reset">
                  Вернуться к входу
                </Button>
              </div>
            )}

            {/* ── RESET PASSWORD FORM ── */}
            {view === "reset" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold">Новый пароль</h2>
                  <p className="text-sm text-muted-foreground mt-1">Введите новый пароль для вашего аккаунта.</p>
                </div>
                <Form {...resetForm}>
                  <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
                    <FormField control={resetForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Новый пароль</FormLabel>
                        <FormControl><Input {...field} type="password" placeholder="Минимум 6 символов" data-testid="input-new-password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={resetForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Подтверждение пароля</FormLabel>
                        <FormControl><Input {...field} type="password" placeholder="Повторите пароль" data-testid="input-confirm-new-password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={resetForm.formState.isSubmitting} data-testid="button-submit-reset">
                      {resetForm.formState.isSubmitting ? "Сохраняем..." : "Сохранить пароль"}
                    </Button>
                  </form>
                </Form>
              </div>
            )}

            {/* ── RESET SUCCESS ── */}
            {view === "reset-success" && (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-lg font-semibold">Пароль изменён</h2>
                <p className="text-sm text-muted-foreground">Теперь вы можете войти с новым паролем.</p>
                <Button className="w-full" onClick={() => { setView("tabs"); setTab("login"); navigate("/auth"); }} data-testid="button-go-to-login">
                  Войти
                </Button>
              </div>
            )}

            {/* ── MAIN TABS (login / register) ── */}
            {view === "tabs" && (
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full mb-6">
                  <TabsTrigger value="login" className="flex-1" data-testid="tab-login">Войти</TabsTrigger>
                  <TabsTrigger value="register" className="flex-1" data-testid="tab-register">Регистрация</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField control={loginForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input {...field} type="email" placeholder="you@example.com" data-testid="input-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={loginForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Пароль</FormLabel>
                          <FormControl><Input {...field} type="password" placeholder="••••••" data-testid="input-password" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting} data-testid="button-submit-login">
                        {loginForm.formState.isSubmitting ? "Входим..." : "Войти"}
                      </Button>
                    </form>
                  </Form>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <button
                      onClick={() => setView("forgot")}
                      className="text-sm text-muted-foreground hover:text-foreground"
                      data-testid="button-forgot-password"
                    >
                      Забыли пароль?
                    </button>
                    <p className="text-sm text-muted-foreground">
                      Нет аккаунта?{" "}
                      <button onClick={() => setTab("register")} className="text-primary font-medium">
                        Зарегистрироваться
                      </button>
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <FormField control={registerForm.control} name="role" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Я регистрируюсь как</FormLabel>
                          <FormControl>
                            <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="buyer" id="buyer" data-testid="radio-buyer" />
                                <label htmlFor="buyer" className="text-sm cursor-pointer">Покупатель</label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="shop" id="shop" data-testid="radio-shop" />
                                <label htmlFor="shop" className="text-sm cursor-pointer">Магазин</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Имя / Название</FormLabel>
                          <FormControl><Input {...field} placeholder="Иван Иванов" data-testid="input-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input {...field} type="email" placeholder="you@example.com" data-testid="input-reg-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Телефон (необязательно)</FormLabel>
                          <FormControl><Input {...field} placeholder="+7 (999) 000-00-00" data-testid="input-phone" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Пароль</FormLabel>
                          <FormControl><Input {...field} type="password" placeholder="Минимум 6 символов" data-testid="input-reg-password" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Подтверждение пароля</FormLabel>
                          <FormControl><Input {...field} type="password" placeholder="Повторите пароль" data-testid="input-confirm-password" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {watchRole === "shop" && (
                        <>
                          <Separator className="my-2" />
                          <p className="text-sm font-semibold text-muted-foreground">Юридическая информация</p>
                          <FormField control={registerForm.control} name="legalType" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Форма собственности</FormLabel>
                              <Select value={field.value || ""} onValueChange={field.onChange}>
                                <FormControl><SelectTrigger data-testid="select-legal-type"><SelectValue placeholder="Выберите форму" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="ip">ИП</SelectItem>
                                  <SelectItem value="ooo">ООО</SelectItem>
                                  <SelectItem value="self">Самозанятый</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={registerForm.control} name="legalName" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Юридическое наименование</FormLabel>
                              <FormControl><Input {...field} placeholder='ИП Иванов И.И. / ООО "Цветы"' data-testid="input-legal-name" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-3">
                            <FormField control={registerForm.control} name="inn" render={({ field }) => (
                              <FormItem>
                                <FormLabel>ИНН</FormLabel>
                                <FormControl><Input {...field} placeholder="1234567890" data-testid="input-inn" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={registerForm.control} name="ogrn" render={({ field }) => (
                              <FormItem>
                                <FormLabel>ОГРН / ОГРНИП</FormLabel>
                                <FormControl><Input {...field} placeholder="1234567890123" data-testid="input-ogrn" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={registerForm.control} name="legalAddress" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Юридический адрес</FormLabel>
                              <FormControl><Input {...field} placeholder="г. Москва, ул. Примерная, д. 1" data-testid="input-legal-address" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <Separator className="my-2" />
                          <p className="text-sm font-semibold text-muted-foreground">Информация о магазине</p>
                          <FormField control={registerForm.control} name="description" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Описание магазина</FormLabel>
                              <FormControl><Textarea {...field} placeholder="Расскажите о вашем магазине..." data-testid="input-shop-description" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={registerForm.control} name="cityId" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Город</FormLabel>
                              <Select value={field.value || ""} onValueChange={field.onChange}>
                                <FormControl><SelectTrigger data-testid="select-city"><SelectValue placeholder="Выберите город" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {cities?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={registerForm.control} name="address" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Адрес магазина</FormLabel>
                              <FormControl><Input {...field} placeholder="Фактический адрес точки" data-testid="input-shop-address" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </>
                      )}

                      <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting} data-testid="button-submit-register">
                        {registerForm.formState.isSubmitting ? "Создаём аккаунт..." : "Создать аккаунт"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
