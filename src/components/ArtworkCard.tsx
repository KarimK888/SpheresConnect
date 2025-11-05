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
}

export const ArtworkCard = ({ artwork, onAction }: ArtworkCardProps) => {
  const { t } = useI18n();

  return (
    <motion.div whileHover={{ translateY: -4 }} className="w-full">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{artwork.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{artwork.description}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black/20">
            <Image
              src={artwork.mediaUrls[0] ?? "https://placehold.co/600x400?text=Artwork"}
              alt={artwork.title}
              fill
              className="object-cover"
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
        <CardFooter>
          <Button disabled={artwork.isSold} onClick={() => onAction?.(artwork.artworkId)}>
            {artwork.isSold ? t("artwork_card_sold") : t("artwork_card_collect")}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
