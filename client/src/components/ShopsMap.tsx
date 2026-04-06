import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin } from "lucide-react";
import type { Shop } from "@shared/schema";

type ShopWithMeta = Shop & { cityName?: string };

interface ShopsMapProps {
  shops: ShopWithMeta[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function ShopsMap({ shops }: ShopsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const ymapInstance = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const shopsWithCoords = shops.filter(
    (s) => s.latitude && s.longitude && Number(s.latitude) !== 0 && Number(s.longitude) !== 0
  );

  const initMap = useCallback(() => {
    if (!mapRef.current || ymapInstance.current) return;
    const ymaps = (window as any).ymaps;

    const center = shopsWithCoords.length > 0
      ? [Number(shopsWithCoords[0].latitude), Number(shopsWithCoords[0].longitude)]
      : [55.751574, 37.573856];

    const map = new ymaps.Map(mapRef.current, {
      center,
      zoom: shopsWithCoords.length > 1 ? 10 : 13,
      controls: ["zoomControl", "geolocationControl"],
    });

    ymapInstance.current = map;
    setMapReady(true);

    if (shopsWithCoords.length <= 1 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (ymapInstance.current) {
            ymapInstance.current.setCenter([coords.latitude, coords.longitude], shopsWithCoords.length === 1 ? 13 : 12);
          }
        },
        () => {}
      );
    }

    shopsWithCoords.forEach((shop) => {
      const lat = Number(shop.latitude);
      const lng = Number(shop.longitude);
      const rating = Number(shop.rating || 0);
      const ratingText = rating > 0 ? `★ ${rating.toFixed(1)} (${shop.reviewCount || 0})` : "";

      const safeName = escapeHtml(shop.name);
      const safeCityName = shop.cityName ? escapeHtml(shop.cityName) : "";
      const safeAddress = shop.address ? escapeHtml(shop.address) : "";
      const safeId = escapeHtml(shop.id);

      const balloonContent = `
        <div style="padding:4px;max-width:250px">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${safeName}</div>
          ${ratingText ? `<div style="color:#f59e0b;font-size:13px;margin-bottom:4px">${ratingText}</div>` : ""}
          ${safeCityName ? `<div style="color:#6b7280;font-size:12px;margin-bottom:4px">📍 ${safeCityName}</div>` : ""}
          ${safeAddress ? `<div style="color:#6b7280;font-size:12px;margin-bottom:8px">${safeAddress}</div>` : ""}
          <a href="/shop/${safeId}" style="display:inline-block;padding:4px 12px;background:#7c3aed;color:white;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500" data-testid="link-shop-balloon-${safeId}">Перейти</a>
        </div>
      `;

      const pm = new ymaps.Placemark(
        [lat, lng],
        {
          hintContent: safeName,
          balloonContent,
        },
        {
          preset: "islands#violetDotIconWithCaption",
          iconCaption: safeName.length > 20 ? safeName.slice(0, 20) + "…" : safeName,
        }
      );

      map.geoObjects.add(pm);
    });

    if (shopsWithCoords.length > 1) {
      const bounds = map.geoObjects.getBounds();
      if (bounds) {
        map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
      }
    }
  }, [shopsWithCoords]);

  const loadYmaps = useCallback(() => {
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
    if (!apiKey) return;

    if ((window as any).ymaps) {
      (window as any).ymaps.ready(initMap);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.onload = () => {
      (window as any).ymaps.ready(initMap);
    };
    document.head.appendChild(script);
  }, [initMap]);

  useEffect(() => {
    loadYmaps();
    return () => {
      if (ymapInstance.current) {
        ymapInstance.current.destroy();
        ymapInstance.current = null;
        setMapReady(false);
      }
    };
  }, [loadYmaps]);

  if (shopsWithCoords.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground space-y-2">
        <MapPin className="w-12 h-12 mx-auto opacity-20" />
        <p className="font-medium">Нет магазинов с координатами</p>
        <p className="text-sm">Магазины появятся на карте после указания адреса</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full h-[500px] rounded-lg border overflow-hidden bg-muted"
        data-testid="shops-map"
      />
      {!mapReady && (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4 mr-2 animate-pulse" />
          Загрузка карты...
        </div>
      )}
    </div>
  );
}
