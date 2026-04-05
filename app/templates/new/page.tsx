import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTemplateForm } from "@/components/create-template-form";
import { getExerciseLibrary } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage() {
  const exerciseLibrary = await getExerciseLibrary();

  return (
    <div className="flex flex-col gap-5 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-black text-foreground">New Workout</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Build your own template
          </p>
        </div>
      </div>

      <CreateTemplateForm exerciseLibrary={exerciseLibrary} />
    </div>
  );
}
