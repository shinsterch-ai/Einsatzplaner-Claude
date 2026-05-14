import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface ExcludedSlot {
  date: string;
  employeeId: string;
  startTime: string;
  endTime: string;
}

export interface AutoAssignRequest {
  date: string;
  preferred_start_time: string;
  preferred_end_time: string;
  duration_minutes: number;
  type: string;
  patient_id: string;
  zone?: string;
  excluded_slots?: ExcludedSlot[];
}

export interface AutoAssignResult {
  success: boolean;
  message: string;
  assigned_employee_id: string | null;
  assigned_employee_name: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  reason?: string;
  alternatives?: {
    employee_id: string;
    employee_name: string;
    start_time: string;
    end_time: string;
    score: number;
  }[];
}

// Silent version that doesn't show toasts (for batch operations)
// Exported so it can be used for sequential processing
export async function autoAssignSilent(request: AutoAssignRequest): Promise<AutoAssignResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        message: 'Nicht angemeldet',
        assigned_employee_id: null,
        assigned_employee_name: null,
        scheduled_start_time: null,
        scheduled_end_time: null,
      };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-assign-employee`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.error || 'Fehler bei der automatischen Zuordnung',
        assigned_employee_id: null,
        assigned_employee_name: null,
        scheduled_start_time: null,
        scheduled_end_time: null,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Auto-assign error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Automatische Zuordnung fehlgeschlagen',
      assigned_employee_id: null,
      assigned_employee_name: null,
      scheduled_start_time: null,
      scheduled_end_time: null,
    };
  }
}

export function useAutoAssign() {
  const [isAssigning, setIsAssigning] = useState(false);

  const autoAssign = async (request: AutoAssignRequest): Promise<AutoAssignResult> => {
    setIsAssigning(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Nicht angemeldet');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-assign-employee`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler bei der automatischen Zuordnung');
      }

      const result: AutoAssignResult = await response.json();
      
      if (result.success && result.assigned_employee_name) {
        toast.success(`${result.assigned_employee_name} automatisch zugewiesen (${result.scheduled_start_time}-${result.scheduled_end_time})`);
      } else if (!result.success) {
        toast.warning(result.message || 'Kein passender Mitarbeiter gefunden');
      }

      return result;
    } catch (error) {
      console.error('Auto-assign error:', error);
      const message = error instanceof Error ? error.message : 'Automatische Zuordnung fehlgeschlagen';
      toast.error(message);
      
      return {
        success: false,
        message,
        assigned_employee_id: null,
        assigned_employee_name: null,
        scheduled_start_time: null,
        scheduled_end_time: null,
      };
    } finally {
      setIsAssigning(false);
    }
  };

  // Auto-assign for multiple dates (for recurring assignments)
  // IMPORTANT: This processes SEQUENTIALLY to prevent double-booking
  const autoAssignBatch = async (
    baseRequest: Omit<AutoAssignRequest, 'date'>,
    dates: string[]
  ): Promise<Map<string, AutoAssignResult>> => {
    setIsAssigning(true);
    const results = new Map<string, AutoAssignResult>();

    try {
      // Track already assigned slots to prevent double-booking
      const assignedSlots: ExcludedSlot[] = [];
      let successCount = 0;
      let failCount = 0;

      // Process SEQUENTIALLY to track and exclude already assigned slots
      for (const date of dates) {
        // Get excluded slots for THIS date from previously assigned slots
        const excludedForDate = assignedSlots.filter(s => s.date === date);
        
        const result = await autoAssignSilent({ 
          ...baseRequest, 
          date,
          excluded_slots: excludedForDate,
        });
        
        results.set(date, result);

        // Track successful assignment to prevent conflicts in subsequent requests
        if (result.success && result.assigned_employee_id && result.scheduled_start_time && result.scheduled_end_time) {
          assignedSlots.push({
            date,
            employeeId: result.assigned_employee_id,
            startTime: result.scheduled_start_time,
            endTime: result.scheduled_end_time,
          });
          successCount++;
        } else {
          failCount++;
        }
      }

      // Show summary toast
      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount} Termine automatisch zugewiesen`);
      } else if (successCount > 0 && failCount > 0) {
        toast.info(`${successCount} Termine zugewiesen, ${failCount} ohne Verfügbarkeit`);
      } else if (failCount > 0) {
        toast.warning(`Keine verfügbaren Mitarbeiter für ${failCount} Termine gefunden`);
      }

      return results;
    } catch (error) {
      console.error('Batch auto-assign error:', error);
      toast.error('Fehler bei der automatischen Zuordnung');
      return results;
    } finally {
      setIsAssigning(false);
    }
  };

  return {
    autoAssign,
    autoAssignBatch,
    isAssigning,
  };
}
