export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ediciones: {
        Row: {
          familia_id: string
          generada_en: string
          id: string
          notas: string | null
          numero: number
        }
        Insert: {
          familia_id: string
          generada_en?: string
          id?: string
          notas?: string | null
          numero: number
        }
        Update: {
          familia_id?: string
          generada_en?: string
          id?: string
          notas?: string | null
          numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "ediciones_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      familias: {
        Row: {
          codigo_acceso_hash: string
          creada_en: string
          id: string
          monograma: string | null
          nombre: string
          slug: string
        }
        Insert: {
          codigo_acceso_hash: string
          creada_en?: string
          id?: string
          monograma?: string | null
          nombre: string
          slug: string
        }
        Update: {
          codigo_acceso_hash?: string
          creada_en?: string
          id?: string
          monograma?: string | null
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      miembros: {
        Row: {
          creado_en: string
          familia_id: string
          rol: string
          user_id: string
        }
        Insert: {
          creado_en?: string
          familia_id: string
          rol: string
          user_id: string
        }
        Update: {
          creado_en?: string
          familia_id?: string
          rol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembros_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          anio: number | null
          apellidos: string
          codigo: string
          creada_en: string
          dia: number
          fallecida: boolean
          familia_id: string
          foto_original: string | null
          foto_web: string | null
          id: string
          mes: number
          nombres: string
          parentesco: string | null
          signo: string | null
        }
        Insert: {
          anio?: number | null
          apellidos?: string
          codigo?: string
          creada_en?: string
          dia: number
          fallecida?: boolean
          familia_id: string
          foto_original?: string | null
          foto_web?: string | null
          id?: string
          mes: number
          nombres: string
          parentesco?: string | null
          signo?: string | null
        }
        Update: {
          anio?: number | null
          apellidos?: string
          codigo?: string
          creada_en?: string
          dia?: number
          fallecida?: boolean
          familia_id?: string
          foto_original?: string | null
          foto_web?: string | null
          id?: string
          mes?: number
          nombres?: string
          parentesco?: string | null
          signo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
      recuerdo_fotos: {
        Row: {
          alto: number | null
          ancho: number | null
          creada_en: string
          familia_id: string
          id: string
          orden: number
          recuerdo_id: string
          ruta_original: string
          ruta_web: string
        }
        Insert: {
          alto?: number | null
          ancho?: number | null
          creada_en?: string
          familia_id: string
          id?: string
          orden?: number
          recuerdo_id: string
          ruta_original: string
          ruta_web: string
        }
        Update: {
          alto?: number | null
          ancho?: number | null
          creada_en?: string
          familia_id?: string
          id?: string
          orden?: number
          recuerdo_id?: string
          ruta_original?: string
          ruta_web?: string
        }
        Relationships: [
          {
            foreignKeyName: "recuerdo_fotos_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuerdo_fotos_recuerdo_id_fkey"
            columns: ["recuerdo_id"]
            isOneToOne: false
            referencedRelation: "recuerdos"
            referencedColumns: ["id"]
          },
        ]
      }
      recuerdo_personas: {
        Row: {
          persona_id: string
          recuerdo_id: string
        }
        Insert: {
          persona_id: string
          recuerdo_id: string
        }
        Update: {
          persona_id?: string
          recuerdo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recuerdo_personas_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuerdo_personas_recuerdo_id_fkey"
            columns: ["recuerdo_id"]
            isOneToOne: false
            referencedRelation: "recuerdos"
            referencedColumns: ["id"]
          },
        ]
      }
      recuerdos: {
        Row: {
          creado_en: string
          creado_por: string | null
          familia_id: string
          fecha: string
          historia: string | null
          id: string
          lugar: string | null
          titulo: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          familia_id: string
          fecha: string
          historia?: string | null
          id?: string
          lugar?: string | null
          titulo: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          familia_id?: string
          fecha?: string
          historia?: string | null
          id?: string
          lugar?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "recuerdos_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cambiar_codigo_acceso: {
        Args: { p_codigo: string; p_familia: string }
        Returns: undefined
      }
      codigo_corto: { Args: { n?: number }; Returns: string }
      crear_familia: {
        Args: {
          p_codigo_acceso: string
          p_monograma?: string
          p_nombre: string
          p_slug: string
        }
        Returns: string
      }
      es_admin: { Args: { fid: string }; Returns: boolean }
      es_miembro: { Args: { fid: string }; Returns: boolean }
      fecha_valida: { Args: { d: number; m: number }; Returns: boolean }
      signo_zodiacal: { Args: { d: number; m: number }; Returns: string }
      verificar_codigo_familia: {
        Args: { p_codigo: string; p_slug: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
