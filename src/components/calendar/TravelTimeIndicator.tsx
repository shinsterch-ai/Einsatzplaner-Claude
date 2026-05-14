import { useState, useEffect } from 'react';
import { Car, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TravelTimeIndicatorProps {
  fromAddress: string | undefined;
  toAddress: string | undefined;
  gapMinutes: number;
  fromPatientName: string;
  toPatientName: string;
}

export function TravelTimeIndicator({
  fromAddress,
  toAddress,
  gapMinutes,
  fromPatientName,
  toPatientName,
}: TravelTimeIndicatorProps) {
  const [travelMinutes, setTravelMinutes] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fromAddress || !toAddress) {
      setTravelMinutes(null);
      setDistanceKm(null);
      setLoading(false);
      return;
    }

    const fetchTravelTime = async () => {
      setLoading(true);
      setError(false);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('calculate-travel-time', {
          body: {
            originAddress: fromAddress,
            destinationAddress: toAddress,
          },
        });

        if (fnError) {
          console.warn('Travel time API not available:', fnError.message);
          setError(true);
          setTravelMinutes(null);
          setDistanceKm(null);
        } else if (data?.error) {
          console.warn('Travel time calculation error:', data.error);
          setError(true);
          setTravelMinutes(null);
          setDistanceKm(null);
        } else if (data) {
          setTravelMinutes(data.travelTimeMinutes);
          setDistanceKm(data.distanceMeters ? Math.round(data.distanceMeters / 100) / 10 : null);
        }
      } catch (err) {
        console.warn('Travel time fetch error:', err);
        setError(true);
        setTravelMinutes(null);
        setDistanceKm(null);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchTravelTime, 300);
    return () => clearTimeout(timer);
  }, [fromAddress, toAddress]);

  const hasConflict = travelMinutes !== null && gapMinutes < travelMinutes;
  const buffer = travelMinutes !== null ? gapMinutes - travelMinutes : null;

  // Don't render if no addresses
  if (!fromAddress || !toAddress) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-1 px-2 my-0.5 rounded bg-zinc-900 text-white text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Fahrzeit...</span>
      </div>
    );
  }

  // Show fallback when API fails - display a muted indicator
  if (error || travelMinutes === null) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 my-0.5 rounded bg-zinc-700 text-zinc-300 text-xs cursor-default">
              <Car className="h-3 w-3" />
              <span>Fahrzeit</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-1">
              <div className="font-medium">
                {fromPatientName} → {toPatientName}
              </div>
              <div className="text-muted-foreground">
                Fahrzeit konnte nicht berechnet werden
              </div>
              <div>
                Zeitfenster: {gapMinutes} Min.
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center gap-1.5 py-1 px-2 my-0.5 rounded text-xs font-medium cursor-default transition-all",
              hasConflict 
                ? "bg-destructive text-destructive-foreground" 
                : "bg-zinc-900 text-white"
            )}
          >
            {hasConflict ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Car className="h-3 w-3" />
            )}
            <span>{travelMinutes} Min.</span>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className={cn(
            "text-xs",
            hasConflict && "bg-destructive text-destructive-foreground border-destructive"
          )}
        >
          <div className="space-y-1">
            <div className="font-medium">
              {fromPatientName} → {toPatientName}
            </div>
            <div className="flex items-center gap-2">
              <span>Fahrzeit: {travelMinutes} Min.</span>
              {distanceKm && <span>({distanceKm} km)</span>}
            </div>
            <div>
              Zeitfenster: {gapMinutes} Min.
            </div>
            {hasConflict ? (
              <div className="font-medium text-destructive-foreground">
                ⚠ {Math.abs(buffer!)} Min. zu wenig Zeit!
              </div>
            ) : (
              <div className="text-green-400">
                ✓ {buffer} Min. Puffer
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
