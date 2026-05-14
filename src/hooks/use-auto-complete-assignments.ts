import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that automatically completes assignments that ended more than 60 minutes ago.
 * This runs once when the component mounts and calls the edge function.
 */
export function useAutoCompleteAssignments() {
  const { organization } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once per session and only if user is authenticated
    if (hasRun.current || !organization?.id) return;
    hasRun.current = true;

    const runAutoComplete = async () => {
      try {
        console.log('Running auto-complete assignments check...');
        
        const { data, error } = await supabase.functions.invoke('auto-complete-assignments', {
          body: {},
        });

        if (error) {
          console.error('Error calling auto-complete-assignments:', error);
          return;
        }

        if (data?.count > 0) {
          console.log(`Auto-completed ${data.count} assignments`);
        }
      } catch (error) {
        console.error('Failed to run auto-complete:', error);
      }
    };

    runAutoComplete();
  }, [organization?.id]);
}
