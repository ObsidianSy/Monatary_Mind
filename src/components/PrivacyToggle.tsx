import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivacy } from "@/contexts/PrivacyContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PrivacyToggle() {
  const { isValuesCensored, toggleCensorship } = usePrivacy();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCensorship}
            className="h-9 w-9"
          >
            {isValuesCensored ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isValuesCensored ? "Mostrar valores" : "Ocultar valores"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
