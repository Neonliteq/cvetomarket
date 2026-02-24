import { Link } from "wouter";
import { MapPin, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "./StarRating";
import { cn } from "@/lib/utils";
import type { Shop } from "@shared/schema";

interface ShopCardProps {
  shop: Shop & { cityName?: string };
  className?: string;
}

export function ShopCard({ shop, className }: ShopCardProps) {
  return (
    <Link href={`/shop/${shop.id}`}>
      <Card className={cn("group cursor-pointer hover-elevate transition-all duration-200 p-4 flex gap-3", className)}>
        <Avatar className="w-14 h-14 shrink-0 rounded-md">
          <AvatarImage src={shop.logoUrl || undefined} alt={shop.name} className="object-cover" />
          <AvatarFallback className="rounded-md text-lg font-bold bg-primary/10 text-primary">
            {shop.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">{shop.name}</p>
            {Number(shop.rating) > 0 && (
              <StarRating rating={Number(shop.rating)} showValue count={shop.reviewCount || 0} size="sm" />
            )}
          </div>
          {shop.cityName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{shop.cityName}</span>
            </div>
          )}
          {shop.workingHours && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{shop.workingHours}</span>
            </div>
          )}
          {shop.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{shop.description}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
