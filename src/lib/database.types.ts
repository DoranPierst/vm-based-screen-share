export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          nickname: string
          password_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          nickname: string
          password_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          nickname?: string
          password_hash?: string
          created_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          host_id: string
          current_controller_id: string | null
          max_participants: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          host_id: string
          current_controller_id?: string | null
          max_participants?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          host_id?: string
          current_controller_id?: string | null
          max_participants?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      room_participants: {
        Row: {
          id: string
          room_id: string
          user_id: string
          joined_at: string
          is_connected: boolean
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          joined_at?: string
          is_connected?: boolean
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          joined_at?: string
          is_connected?: boolean
        }
      }
      chat_messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          message?: string
          created_at?: string
        }
      }
    }
  }
}
