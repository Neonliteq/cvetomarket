import { db } from "./db";
import { users, shops, products, categories, cities, platformSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function seed() {
  try {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) return;

    console.log("Seeding database...");

    await db.insert(platformSettings).values({ id: "global", commissionRate: "10", deliveryCost: "300" })
      .onConflictDoNothing();

    const cityList = await db.insert(cities).values([
      { name: "Москва" },
      { name: "Санкт-Петербург" },
      { name: "Казань" },
      { name: "Екатеринбург" },
    ]).returning();

    const categoryList = await db.insert(categories).values([
      { name: "День рождения", slug: "birthday" },
      { name: "Романтика", slug: "romance" },
      { name: "8 марта", slug: "march8" },
      { name: "Свадьба", slug: "wedding" },
      { name: "Сочувствие", slug: "sympathy" },
      { name: "Корпоратив", slug: "corporate" },
    ]).returning();

    const hash = await bcrypt.hash("admin123", 10);
    const hashUser = await bcrypt.hash("password123", 10);

    const adminUser = await db.insert(users).values({
      email: "admin@cveto.ru",
      password: hash,
      name: "Администратор",
      role: "admin",
    }).returning();

    const shopOwners = await db.insert(users).values([
      { email: "roses@cveto.ru", password: hashUser, name: "Розарий", role: "shop" },
      { email: "bloomy@cveto.ru", password: hashUser, name: "Bloomy Studio", role: "shop" },
      { email: "tulips@cveto.ru", password: hashUser, name: "Тюльпан Экспресс", role: "shop" },
    ]).returning();

    const buyer = await db.insert(users).values({
      email: "buyer@cveto.ru",
      password: hashUser,
      name: "Мария Иванова",
      phone: "+7 999 123 45 67",
      role: "buyer",
    }).returning();

    const shopList = await db.insert(shops).values([
      {
        ownerId: shopOwners[0].id,
        name: "Розарий",
        description: "Элегантные букеты из свежих роз. Работаем с лучшими поставщиками из Голландии и Эквадора.",
        cityId: cityList[0].id,
        address: "ул. Тверская, д. 15",
        phone: "+7 495 123-45-67",
        email: "info@rozariy.ru",
        deliveryZone: "Центральный округ",
        workingHours: "9:00–21:00",
        status: "approved",
        rating: "4.8",
        reviewCount: 127,
        logoUrl: "/images/shop1-logo.png",
      },
      {
        ownerId: shopOwners[1].id,
        name: "Bloomy Studio",
        description: "Авторские флористические композиции и необычные букеты. Доставка в день заказа.",
        cityId: cityList[0].id,
        address: "ул. Арбат, д. 42",
        phone: "+7 495 987-65-43",
        email: "hello@bloomy.ru",
        deliveryZone: "Весь город",
        workingHours: "8:00–22:00",
        status: "approved",
        rating: "4.9",
        reviewCount: 203,
        logoUrl: "/images/shop2-logo.png",
      },
      {
        ownerId: shopOwners[2].id,
        name: "Тюльпан Экспресс",
        description: "Свежие тюльпаны и полевые цветы. Быстрая доставка за 60 минут.",
        cityId: cityList[1].id,
        address: "пр. Невский, д. 88",
        phone: "+7 812 555-77-99",
        email: "spb@tulipan.ru",
        deliveryZone: "Центральный, Адмиралтейский",
        workingHours: "10:00–20:00",
        status: "approved",
        rating: "4.6",
        reviewCount: 89,
        logoUrl: "/images/shop3-logo.png",
      },
    ]).returning();

    await db.insert(products).values([
      {
        shopId: shopList[0].id,
        categoryId: categoryList[1].id,
        name: "51 красная роза",
        description: "Роскошный букет из 51 красной розы сорта Explorer. Стебли 70 см, бутоны крупные, насыщенный аромат.",
        price: "7500",
        images: ["/images/product-roses-red.png", "/images/product-roses-red-2.png"],
        assemblyTime: 30,
        inStock: true,
        isActive: true,
        rating: "4.9",
        reviewCount: 34,
      },
      {
        shopId: shopList[0].id,
        categoryId: categoryList[0].id,
        name: "Пионовый рай",
        description: "Нежный букет из сезонных пионов. Идеально для дня рождения. Доступен в розовом и белом цвете.",
        price: "4500",
        images: ["/images/product-pions.png"],
        assemblyTime: 45,
        inStock: true,
        isActive: true,
        rating: "4.7",
        reviewCount: 21,
      },
      {
        shopId: shopList[0].id,
        categoryId: categoryList[2].id,
        name: "Весенний привет",
        description: "Яркий весенний букет с тюльпанами, ирисами и мимозой. Специальная коллекция к 8 марта.",
        price: "3200",
        images: ["/images/product-spring.png"],
        assemblyTime: 40,
        inStock: true,
        isActive: true,
        rating: "4.8",
        reviewCount: 56,
      },
      {
        shopId: shopList[1].id,
        categoryId: categoryList[3].id,
        name: "Белое облако",
        description: "Свадебный букет невесты из белых роз, лизиантуса и эвкалипта. Авторская работа флориста.",
        price: "12000",
        images: ["/images/product-wedding.png"],
        assemblyTime: 120,
        inStock: true,
        isActive: true,
        rating: "5.0",
        reviewCount: 12,
      },
      {
        shopId: shopList[1].id,
        categoryId: categoryList[1].id,
        name: "Романтичный сюрприз",
        description: "Авторский букет из пионовидных роз, хризантем и зелени. Упакован в крафт с лентой.",
        price: "5800",
        images: ["/images/product-romantic.png"],
        assemblyTime: 60,
        inStock: true,
        isActive: true,
        rating: "4.8",
        reviewCount: 43,
      },
      {
        shopId: shopList[1].id,
        categoryId: categoryList[5].id,
        name: "Корпоративная композиция",
        description: "Стильная офисная композиция из хризантем и зелени в стильном горшке. Долго стоит.",
        price: "8500",
        images: ["/images/product-corporate.png"],
        assemblyTime: 90,
        inStock: true,
        isActive: true,
        rating: "4.6",
        reviewCount: 18,
      },
      {
        shopId: shopList[2].id,
        categoryId: categoryList[0].id,
        name: "25 тюльпанов",
        description: "Ярко-розовые тюльпаны сорта Pink Star из Голландии. Свежее поступление каждый день.",
        price: "2800",
        images: ["/images/product-tulips.png"],
        assemblyTime: 20,
        inStock: true,
        isActive: true,
        rating: "4.7",
        reviewCount: 67,
      },
      {
        shopId: shopList[2].id,
        categoryId: categoryList[4].id,
        name: "Нежное сочувствие",
        description: "Спокойный букет из белых хризантем, лилий и зелени. Для выражения соболезнований.",
        price: "3500",
        images: ["/images/product-sympathy.png"],
        assemblyTime: 45,
        inStock: true,
        isActive: true,
        rating: "4.9",
        reviewCount: 8,
      },
    ]);

    console.log("Database seeded successfully!");
  } catch (e) {
    console.error("Seed error:", e);
  }
}
