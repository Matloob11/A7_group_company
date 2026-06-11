export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          agent_id: string;
          name: string;
          phone?: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          name: string;
          phone?: string | null;
          status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          name?: string;
          phone?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          lead_name: string;
          phone: string;
          source: string;
          assigned_agent_id: string;
          status: string;
          project_interest: string;
          lead_score: number;
          followup_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_name: string;
          phone: string;
          source: string;
          assigned_agent_id: string;
          status: string;
          project_interest: string;
          lead_score: number;
          followup_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_name?: string;
          phone?: string;
          source?: string;
          assigned_agent_id?: string;
          status?: string;
          project_interest?: string;
          lead_score?: number;
          followup_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          project_name: string;
          developer_name: string;
          location: string;
          status: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_name: string;
          developer_name: string;
          location: string;
          status: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_name?: string;
          developer_name?: string;
          location?: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      call_logs: {
        Row: {
          id: string;
          lead_id: string;
          agent_id: string;
          call_status: string;
          call_summary: string | null;
          call_duration: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          agent_id: string;
          call_status: string;
          call_summary?: string | null;
          call_duration: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          agent_id?: string;
          call_status?: string;
          call_summary?: string | null;
          call_duration?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
