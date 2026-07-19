// Isolated Supabase API client using fetch (not the Supabase JS client)
// This is used only for equipment monitoring pages to avoid type conflicts

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation', // Return inserted/updated data
};

// Type definitions (isolated)
export interface Equipment {
  id: number;
  name: string;
  unit: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EquipmentLog {
  id: number;
  equipment_id: number;
  event_type: 'START' | 'STOP';
  timestamp: string;
  reason: string | null;
  shift: string | null;
  update_beban_pln: number | null;
  update_beban_btg: number | null;
  created_by: string;
  created_at: string;
}

export interface EquipmentLogWithDetails extends EquipmentLog {
  equipment_name: string;
  unit: string;
}

export interface IdleTimeResult {
  equipment_name: string;
  unit: string;
  event_type: string;
  timestamp: string;
  idle_time_hours: number;
  running_time_hours: number;
  last_event_type: string;
}

// Equipment API
export async function getEquipment(activeOnly = true): Promise<Equipment[]> {
  let url = `${SUPABASE_URL}/rest/v1/equipment?order=unit,name`;
  if (activeOnly) {
    url += '&is_active=eq.true';
  }
  
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Equipment API Error:', response.status, errorText);
    throw new Error(`Failed to fetch equipment: ${response.status} ${errorText}`);
  }
  return response.json();
}

export async function getEquipmentLogs(): Promise<EquipmentLogWithDetails[]> {
  const url = `${SUPABASE_URL}/rest/v1/equipment_logs?select=*,equipment!inner(id,name,unit)&order=timestamp.desc`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error('Failed to fetch equipment logs');
  const data = await response.json();
  
  // Transform to flatten equipment data
  return data.map((log: any) => ({
    ...log,
    equipment_name: log.equipment.name,
    unit: log.equipment.unit,
  }));
}

export async function createEquipmentLog(log: Omit<EquipmentLog, 'id' | 'created_at'>): Promise<EquipmentLog> {
  const url = `${SUPABASE_URL}/rest/v1/equipment_logs`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(log),
  });
  if (!response.ok) throw new Error('Failed to create equipment log');
  return response.json();
}

export async function updateEquipmentLog(id: number, log: Partial<EquipmentLog>): Promise<EquipmentLog> {
  const url = `${SUPABASE_URL}/rest/v1/equipment_logs?id=eq.${id}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(log),
  });
  if (!response.ok) throw new Error('Failed to update equipment log');
  const data = await response.json();
  if (Array.isArray(data) && data.length > 0) return data[0];
  throw new Error('No data returned from update');
}

export async function deleteEquipmentLog(id: number): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/equipment_logs?id=eq.${id}`;
  const response = await fetch(url, { method: 'DELETE', headers });
  if (!response.ok) throw new Error('Failed to delete equipment log');
}

// Idle Time Calculation
export async function calculateIdleTime(params: {
  start_date?: string;
  end_date?: string;
  unit_filter?: string;
}): Promise<IdleTimeResult[]> {
  const { start_date, end_date, unit_filter } = params;
  
  // Build query parameters
  const searchParams = new URLSearchParams();
  if (start_date) searchParams.set('start_date', start_date);
  if (end_date) searchParams.set('end_date', end_date);
  if (unit_filter) searchParams.set('unit_filter', unit_filter);
  
  const queryString = searchParams.toString();
  const url = `${SUPABASE_URL}/rest/v1/rpc/calculate_idle_time${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) throw new Error('Failed to calculate idle time');
  return response.json();
}