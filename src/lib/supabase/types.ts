// ===== Supabase Database Type Definitions =====

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number;
          name: string;
          email: string;
          phone: string;
          unit: string;
          department: string;
          username: string;
          password: string;
          role: string;
          regu: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          email: string;
          phone?: string;
          unit?: string;
          department?: string;
          username: string;
          password: string;
          role: string;
          regu?: string;
          status?: string;
        };
        Update: {
          name?: string;
          email?: string;
          phone?: string;
          unit?: string;
          department?: string;
          username?: string;
          password?: string;
          role?: string;
          regu?: string;
          status?: string;
        };
        Relationships: [];
      };
      switch_gears: {
        Row: {
          id: number;
          name: string;
          location: string;
          unit: string;
          status: string;
          pic: string;
          requester: string;
          active_time: string;
          finish_time: string;
          notif_no: string;
          lototo_no: string;
          image: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          location?: string;
          unit?: string;
          status?: string;
          pic?: string;
          requester?: string;
          active_time?: string;
          finish_time?: string;
          notif_no?: string;
          lototo_no?: string;
          image?: string;
          description?: string;
        };
        Update: {
          name?: string;
          location?: string;
          unit?: string;
          status?: string;
          pic?: string;
          requester?: string;
          active_time?: string;
          finish_time?: string;
          notif_no?: string;
          lototo_no?: string;
          image?: string;
          description?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: number;
          action: string;
          user: string;
          page: string;
          timestamp: string;
          details: string;
          created_at: string;
        };
        Insert: {
          action: string;
          user: string;
          page?: string;
          timestamp?: string;
          details?: string;
        };
        Update: {
          action?: string;
          user?: string;
          page?: string;
          timestamp?: string;
          details?: string;
        };
        Relationships: [];
      };
      change_approvals: {
        Row: {
          id: number;
          table_name: string;
          record_id: number;
          action_type: string;
          old_data: any;
          new_data: any;
          regu: string;
          status: string;
          requested_by: number;
          requested_by_name: string;
          reviewed_by: number | null;
          review_notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          table_name: string;
          record_id: number;
          action_type: string;
          old_data?: any;
          new_data?: any;
          regu?: string;
          status?: string;
          requested_by: number;
          requested_by_name?: string;
          reviewed_by?: number | null;
          review_notes?: string;
        };
        Update: {
          status?: string;
          reviewed_by?: number | null;
          review_notes?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
  };
}
