import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeliveryZone {
  id: string;
  name: string;
  price: number;
  color: string;
  coordinates: number[][];
}

interface CheckoutMapProps {
  shopId: string;
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  initialAddress?: string;
}

export function CheckoutMap({ shopId, onAddressSelect, initialAddress }: CheckoutMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const ymapInstance = useRef<any>(null);
  const placemark = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

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
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || ymapInstance.current) return;
    const ymaps = (window as any).ymaps;

    const map = new ymaps.Map(mapRef.current, {
      center: [55.751574, 37.573856],
      zoom: 11,
      controls: ["zoomControl", "searchControl", "geolocationControl"],
    });

    ymapInstance.current = map;
    setMapReady(true);

    fetch(`/api/shops/${shopId}/delivery-zones`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const zones: DeliveryZone[] = data.zones || [];
        zones.forEach((zone) => {
          const polygon = new ymaps.Polygon(
            [zone.coordinates],
            {
              hintContent: `${zone.name}: ${zone.price === 0 ? "Бесплатно" : zone.price + " ₽"}`,
              balloonContent: `${zone.name}: ${zone.price === 0 ? "Бесплатная доставка" : zone.price + " ₽"}`,
            },
            {
              fillColor: zone.color + "30",
              strokeColor: zone.color,
              strokeWidth: 2,
            }
          );
          map.geoObjects.add(polygon);
        });

        if (zones.length > 0) {
          const allCoords = zones.flatMap((z) => z.coordinates);
          if (allCoords.length > 0) {
            const lats = allCoords.map((c) => c[0]);
            const lngs = allCoords.map((c) => c[1]);
            const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
            const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
            map.setCenter([cLat, cLng], 11);
          }
        }
      })
      .catch(() => {});

    map.events.add("click", (e: any) => {
      const coords = e.get("coords");
      placeMarker(coords[0], coords[1]);
      reverseGeocode(coords[0], coords[1]);
    });

    const searchControl = map.controls.get("searchControl");
    if (searchControl) {
      searchControl.events.add("resultselect", () => {
        const result = searchControl.getResultsArray();
        if (result && result.length > 0) {
          const selected = searchControl.getSelectedIndex();
          const geoObject = result[selected];
          if (geoObject) {
            const coords = geoObject.geometry.getCoordinates();
            placeMarker(coords[0], coords[1]);
            const addr = geoObject.getAddressLine?.() || geoObject.properties.get("text") || "";
            setSelectedAddress(addr);
            onAddressSelect(addr, coords[0], coords[1]);
          }
        }
      });
    }

    if (initialAddress && initialAddress.length > 3) {
      const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
      fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(initialAddress)}&format=json`)
        .then((r) => r.json())
        .then((data) => {
          const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
          if (pos) {
            const [lng, lat] = pos.split(" ").map(Number);
            placeMarker(lat, lng);
            map.setCenter([lat, lng], 15);
          }
        })
        .catch(() => {});
    }
  }, [shopId, initialAddress]);

  const placeMarker = (lat: number, lng: number) => {
    const ymaps = (window as any).ymaps;
    const map = ymapInstance.current;
    if (!ymaps || !map) return;

    if (placemark.current) {
      map.geoObjects.remove(placemark.current);
    }

    const pm = new ymaps.Placemark(
      [lat, lng],
      { iconCaption: "Адрес доставки" },
      {
        preset: "islands#redDotIconWithCaption",
        draggable: true,
      }
    );

    pm.events.add("dragend", () => {
      const newCoords = pm.geometry.getCoordinates();
      reverseGeocode(newCoords[0], newCoords[1]);
    });

    map.geoObjects.add(pm);
    placemark.current = pm;
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
    if (!apiKey) return;
    try {
      const res = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${lng},${lat}&format=json&kind=house&results=1`
      );
      const data = await res.json();
      const geoObj = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
      if (geoObj) {
        const addr = geoObj.metaDataProperty?.GeocoderMetaData?.text || geoObj.name || "";
        setSelectedAddress(addr);
        onAddressSelect(addr, lat, lng);
        if (placemark.current) {
          placemark.current.properties.set("iconCaption", addr.length > 40 ? addr.slice(0, 40) + "…" : addr);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (expanded) {
      loadYmaps();
    }
    return () => {
      if (ymapInstance.current) {
        ymapInstance.current.destroy();
        ymapInstance.current = null;
        placemark.current = null;
        setMapReady(false);
      }
    };
  }, [expanded, loadYmaps]);

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 w-full"
        onClick={() => setExpanded(true)}
        data-testid="button-open-map"
      >
        <MapPin className="w-4 h-4" />
        Выбрать на карте
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full h-[300px] rounded-lg border overflow-hidden bg-muted"
        data-testid="checkout-address-map"
      />
      {!mapReady && (
        <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4 mr-2 animate-pulse" /> Загрузка карты...
        </div>
      )}
      {mapReady && (
        <p className="text-xs text-muted-foreground">
          Кликните по карте или перетащите метку, чтобы указать адрес доставки. Зоны доставки магазина отображены на карте.
        </p>
      )}
      {selectedAddress && (
        <p className="text-xs font-medium text-primary" data-testid="text-selected-address">
          Выбрано: {selectedAddress}
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(false)}
        data-testid="button-close-map"
      >
        Свернуть карту
      </Button>
    </div>
  );
}
