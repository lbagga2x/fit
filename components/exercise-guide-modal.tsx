"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";

type Props = {
  name: string;
  gifUrl: string | null;
  open: boolean;
  onClose: () => void;
};

export function ExerciseGuideModal({ name, gifUrl, open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{name}</DialogTitle>
        </DialogHeader>

        {gifUrl ? (
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-muted">
            <Image
              src={gifUrl}
              alt={name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center aspect-square rounded-xl bg-muted text-center gap-2 px-4">
            <span className="text-4xl">🏋️</span>
            <p className="text-sm text-muted-foreground">No image available for this exercise.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center -mt-1">
          Images from{" "}
          <span className="underline underline-offset-2">free-exercise-db</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
