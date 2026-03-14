import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { City } from "@shared/schema";

interface CityContextValue {
  selectedCityId: string | null;
  setSelectedCityId: (id: string | null) => void;
  selectedCity: City | null;
  cities: City[];
  citiesLoading: boolean;
}

const CityContext = createContext<CityContextValue>({
  selectedCityId: null,
  setSelectedCityId: () => {},
  selectedCity: null,
  cities: [],
  citiesLoading: false,
});

const STORAGE_KEY = "cveto_selected_city";

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [selectedCityId, setSelectedCityIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery<City[]>({
    queryKey: ["/api/cities"],
  });

  const setSelectedCityId = (id: string | null) => {
    setSelectedCityIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const selectedCity = cities.find((c) => c.id === selectedCityId) ?? null;

  useEffect(() => {
    if (!citiesLoading && cities.length > 0 && selectedCityId) {
      const stillExists = cities.some((c) => c.id === selectedCityId);
      if (!stillExists) setSelectedCityId(null);
    }
  }, [cities, citiesLoading]);

  return (
    <CityContext.Provider value={{ selectedCityId, setSelectedCityId, selectedCity, cities, citiesLoading }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  return useContext(CityContext);
}
