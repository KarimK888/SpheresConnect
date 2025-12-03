"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useI18n } from "@/context/i18n";
import type { Artwork } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface ArtworkCardProps {
  artwork: Artwork;
  onAction?: (artworkId: string) => void;
  onSelect?: (artwork: Artwork) => void;
  actionLabel?: string;
  disabled?: boolean;
}

const statusVariant: Record<Artwork["status"], "default" | "outline"> = {
  listed: "outline",
  negotiation: "default",
  sold: "default"
};

export const ArtworkCard = ({ artwork, onAction, onSelect, actionLabel, disabled }: ArtworkCardProps) => {
  const { t } = useI18n();
  const variant = statusVariant[artwork.status] ?? "outline";
  const labelMap: Record<Artwork["status"], string> = {
    listed: t("marketplace_status_listed"),
    negotiation: t("marketplace_status_negotiation"),
    sold: t("marketplace_status_sold")
  };

  return (
    <motion.div
      whileHover={{ translateY: -4 }}
      className={`w-full ${onSelect ? "cursor-pointer" : ""}`}
      onClick={() => onSelect?.(artwork)}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(artwork);
        }
      }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{artwork.title}</CardTitle>
            <Badge variant={variant} className="text-[11px] uppercase tracking-wide">
              {labelMap[artwork.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{artwork.description}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black/20">
            <Image
              src={artwork.mediaUrls[0] ?? "https://placehold.co/600x400?text=Artwork"}
              alt={artwork.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {artwork.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-lg font-semibold text-primary">
            {(artwork.price / 100).toLocaleString(undefined, {
              style: "currency",
              currency: artwork.currency.toUpperCase()
            })}
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            disabled={artwork.isSold || disabled}
            onClick={(event) => {
              event.stopPropagation();
              onAction?.(artwork.artworkId);
            }}
          >
            {artwork.isSold ? t("artwork_card_sold") : actionLabel ?? t("artwork_card_collect")}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
