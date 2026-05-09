import { createClient } from '@/lib/supabase/client';

// Maintain backward compatibility: `import { supabase } from '@/lib/supabase'`
export const supabase = createClient();
