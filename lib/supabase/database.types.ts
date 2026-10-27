
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "answers": {
                  Row: {
                    "attempt_id": string,"flagged": boolean,"is_correct": boolean | null,"max_score": number | null,"question_id": string,"score": number | null,"score_part": Json | null,"time_spent_sec": number,"updated_at": string,"value_json": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_id": string,"flagged"?: boolean,"is_correct"?: boolean | null,"max_score"?: number | null,"question_id": string,"score"?: number | null,"score_part"?: Json | null,"time_spent_sec"?: number,"updated_at"?: string,"value_json"?: Json | null
                  }
                  Update: {
                    "attempt_id"?: string,"flagged"?: boolean,"is_correct"?: boolean | null,"max_score"?: number | null,"question_id"?: string,"score"?: number | null,"score_part"?: Json | null,"time_spent_sec"?: number,"updated_at"?: string,"value_json"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "answers_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"attempts": {
                  Row: {
                    "deadline_at": string,"exam_id": string,"id": string,"is_estimate": boolean,"level": string | null,"max_raw": number | null,"raw_score": number | null,"scaled_score": number | null,"scoring_version": string | null,"started_at": string,"status": Database["public"]['Enums']["attempt_status"],"submit_reason": Database["public"]['Enums']["submit_reason"] | null,"submitted_at": string | null,"tab_switches": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "deadline_at": string,"exam_id": string,"id"?: string,"is_estimate"?: boolean,"level"?: string | null,"max_raw"?: number | null,"raw_score"?: number | null,"scaled_score"?: number | null,"scoring_version"?: string | null,"started_at"?: string,"status"?: Database["public"]['Enums']["attempt_status"],"submit_reason"?: Database["public"]['Enums']["submit_reason"] | null,"submitted_at"?: string | null,"tab_switches"?: number,"user_id": string
                  }
                  Update: {
                    "deadline_at"?: string,"exam_id"?: string,"id"?: string,"is_estimate"?: boolean,"level"?: string | null,"max_raw"?: number | null,"raw_score"?: number | null,"scaled_score"?: number | null,"scoring_version"?: string | null,"started_at"?: string,"status"?: Database["public"]['Enums']["attempt_status"],"submit_reason"?: Database["public"]['Enums']["submit_reason"] | null,"submitted_at"?: string | null,"tab_switches"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attempts_exam_id_fkey"
      columns: ["exam_id"]
isOneToOne: false
      referencedRelation: "exams"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor": string | null,"created_at": string,"details": NonNullable<Json>,"entity": string | null,"entity_id": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity"?: string | null,"entity_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity"?: string | null,"entity_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"blocks": {
                  Row: {
                    "code": string,"id": number,"name_uz": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"id": number,"name_uz": string,"sort": number
                  }
                  Update: {
                    "code"?: string,"id"?: number,"name_uz"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"exam_formats": {
                  Row: {
                    "code": string,"created_at": string,"duration_min": number,"id": string,"scoring": NonNullable<Json>,"spec": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"duration_min": number,"id"?: string,"scoring": NonNullable<Json>,"spec": NonNullable<Json>
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"duration_min"?: number,"id"?: string,"scoring"?: NonNullable<Json>,"spec"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"exam_items": {
                  Row: {
                    "exam_id": string,"position": number,"question_id": string,"section": Database["public"]['Enums']["question_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "exam_id": string,"position": number,"question_id": string,"section": Database["public"]['Enums']["question_type"]
                  }
                  Update: {
                    "exam_id"?: string,"position"?: number,"question_id"?: string,"section"?: Database["public"]['Enums']["question_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "exam_items_exam_id_fkey"
      columns: ["exam_id"]
isOneToOne: false
      referencedRelation: "exams"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exam_items_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"exams": {
                  Row: {
                    "code": string | null,"created_at": string,"format_id": string,"id": string,"is_free": boolean,"published_at": string | null,"sort": number,"status": Database["public"]['Enums']["exam_status"],"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code"?: string | null,"created_at"?: string,"format_id": string,"id"?: string,"is_free"?: boolean,"published_at"?: string | null,"sort"?: number,"status"?: Database["public"]['Enums']["exam_status"],"title": string
                  }
                  Update: {
                    "code"?: string | null,"created_at"?: string,"format_id"?: string,"id"?: string,"is_free"?: boolean,"published_at"?: string | null,"sort"?: number,"status"?: Database["public"]['Enums']["exam_status"],"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exams_format_id_fkey"
      columns: ["format_id"]
isOneToOne: false
      referencedRelation: "exam_formats"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "consent_at": string | null,"created_at": string,"grade": string | null,"id": string,"lang": string | null,"name": string,"phone": string | null,"role": Database["public"]['Enums']["user_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_at"?: string | null,"created_at"?: string,"grade"?: string | null,"id": string,"lang"?: string | null,"name"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "consent_at"?: string | null,"created_at"?: string,"grade"?: string | null,"id"?: string,"lang"?: string | null,"name"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"question_keys": {
                  Row: {
                    "key_json": NonNullable<Json>,"question_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "key_json": NonNullable<Json>,"question_id": string
                  }
                  Update: {
                    "key_json"?: NonNullable<Json>,"question_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_keys_question_id_fkey"
      columns: ["question_id"]
isOneToOne: true
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"question_topics": {
                  Row: {
                    "question_id": string,"topic_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "question_id": string,"topic_id": number
                  }
                  Update: {
                    "question_id"?: string,"topic_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_topics_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "question_topics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "author_id": string | null,"b_param": number | null,"block_id": number,"created_at": string,"difficulty": Database["public"]['Enums']["difficulty"],"est_seconds": number | null,"external_id": string | null,"i18n": NonNullable<Json>,"id": string,"mistake_note_md": string | null,"payload": NonNullable<Json>,"primary_topic_id": number,"solution_md": string | null,"source": string | null,"status": Database["public"]['Enums']["question_status"],"stem_md": string,"supersedes_id": string | null,"type": Database["public"]['Enums']["question_type"],"updated_at": string,"version": number,"weight": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"b_param"?: number | null,"block_id": number,"created_at"?: string,"difficulty": Database["public"]['Enums']["difficulty"],"est_seconds"?: number | null,"external_id"?: string | null,"i18n"?: NonNullable<Json>,"id"?: string,"mistake_note_md"?: string | null,"payload": NonNullable<Json>,"primary_topic_id": number,"solution_md"?: string | null,"source"?: string | null,"status"?: Database["public"]['Enums']["question_status"],"stem_md": string,"supersedes_id"?: string | null,"type": Database["public"]['Enums']["question_type"],"updated_at"?: string,"version"?: number,"weight"?: number | null
                  }
                  Update: {
                    "author_id"?: string | null,"b_param"?: number | null,"block_id"?: number,"created_at"?: string,"difficulty"?: Database["public"]['Enums']["difficulty"],"est_seconds"?: number | null,"external_id"?: string | null,"i18n"?: NonNullable<Json>,"id"?: string,"mistake_note_md"?: string | null,"payload"?: NonNullable<Json>,"primary_topic_id"?: number,"solution_md"?: string | null,"source"?: string | null,"status"?: Database["public"]['Enums']["question_status"],"stem_md"?: string,"supersedes_id"?: string | null,"type"?: Database["public"]['Enums']["question_type"],"updated_at"?: string,"version"?: number,"weight"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_block_id_fkey"
      columns: ["block_id"]
isOneToOne: false
      referencedRelation: "blocks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_primary_topic_id_fkey"
      columns: ["primary_topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_supersedes_id_fkey"
      columns: ["supersedes_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count": number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"topics": {
                  Row: {
                    "block_id": number,"id": number,"name_ru": string | null,"name_uz": string
                  }
                  ComputedFields: never
                  Insert: {
                    "block_id": number,"id": number,"name_ru"?: string | null,"name_uz": string
                  }
                  Update: {
                    "block_id"?: number,"id"?: number,"name_ru"?: string | null,"name_uz"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "topics_block_id_fkey"
      columns: ["block_id"]
isOneToOne: false
      referencedRelation: "blocks"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_assert_staff":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"admin_attempts":
{ Args: { "p_exam"?: string,"p_limit"?: number,"p_offset"?: number,"p_status"?: string }; Returns: Json
                           },
"admin_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_participants":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_search"?: string }; Returns: Json
                           },
"admin_question_stats":
{ Args: { "p_exam"?: string }; Returns: Json
                           },
"cleanup_guest_users":
{ Args: { "p_older_than"?: string }; Returns: number
                           },
"close_attempt":
{ Args: { "p_attempt_id": string,"p_only_if_expired"?: boolean }; Returns: Json
                           },
"get_attempt_state":
{ Args: { "p_attempt_id": string,"p_lang"?: string }; Returns: Json
                           },
"get_my_mistakes":
{ Args: { "p_lang"?: string }; Returns: Json
                           },
"get_my_topic_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"import_questions":
{ Args: { "p_exam"?: Json,"p_questions": Json }; Returns: Json
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_audit":
{ Args: { "p_action": string,"p_actor": string,"p_details"?: Json,"p_entity"?: string,"p_entity_id"?: string }; Returns: undefined
                           },
"log_tab_switch":
{ Args: { "p_attempt_id": string }; Returns: undefined
                           },
"publish_exam":
{ Args: { "p_exam_id": string }; Returns: undefined
                           },
"rate_limit_hit":
{ Args: { "p_key": string,"p_limit": number,"p_window_sec": number }; Returns: boolean
                           },
"save_answer":
{ Args: { "p_attempt_id": string,"p_flagged"?: boolean,"p_question_id": string,"p_time_spent"?: number,"p_value"?: Json }; Returns: Json
                           },
"start_attempt":
{ Args: { "p_exam_id": string }; Returns: Json
                           },
"store_attempt_score":
{ Args: { "p_attempt_id": string,"p_level": string,"p_max": number,"p_raw": number,"p_results": Json,"p_scaled": number,"p_scoring_version": string }; Returns: boolean
                           }
          }
          Enums: {
            "attempt_status": "in_progress"|"submitted","difficulty": "L1"|"L2"|"L3","exam_status": "draft"|"published"|"archived","question_status": "draft"|"review"|"published"|"archived","question_type": "y1"|"y2"|"o","submit_reason": "user"|"timeout","user_role": "student"|"editor"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "attempt_status": ["in_progress", "submitted"],"difficulty": ["L1", "L2", "L3"],"exam_status": ["draft", "published", "archived"],"question_status": ["draft", "review", "published", "archived"],"question_type": ["y1", "y2", "o"],"submit_reason": ["user", "timeout"],"user_role": ["student", "editor", "admin"]
          }
        }
} as const
