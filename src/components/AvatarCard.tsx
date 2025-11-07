"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { User } from "../lib/types";

interface AvatarCardProps {
  user: User;
  onSelect?: (userId: string) => void;
}

export const AvatarCard = ({ user, onSelect }: AvatarCardProps) => {
  const initials = user.displayName.slice(0, 2).toUpperCase();
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }}>
      <Card className="w-full max-w-xs cursor-pointer bg-card/90" onClick={() => onSelect?.(user.userId)}>
        <CardHeader className="items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-background/80">
            {user.profilePictureUrl ? (
              <Image
                src={user.profilePictureUrl}
                alt={user.displayName}
                width={96}
                height={96}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-2xl font-semibold uppercase">{initials}</span>
            )}
          </div>
          <CardTitle>{user.displayName}</CardTitle>
          <p className="text-sm text-muted-foreground">{user.bio}</p>
          {user.isVerified && <Badge variant="default">Verified</Badge>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {user.skills.slice(0, 6).map((skill) => (
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
