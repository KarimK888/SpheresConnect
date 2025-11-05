export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string;
          email: string;
          display_name: string | null;
          bio: string | null;
          skills: string[] | null;
          profile_picture_url: string | null;
          connections: string[] | null;
          is_verified: boolean | null;
          language: "en" | "fr" | "es" | null;
          location: { lat: number; lng: number } | null;
          joined_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          display_name?: string | null;
          bio?: string | null;
          skills?: string[] | null;
          profile_picture_url?: string | null;
          connections?: string[] | null;
          is_verified?: boolean | null;
          language?: "en" | "fr" | "es" | null;
          location?: { lat: number; lng: number } | null;
          joined_at?: string;
        };
        Update: {
          display_name?: string | null;
          bio?: string | null;
          skills?: string[] | null;
          profile_picture_url?: string | null;
          connections?: string[] | null;
          is_verified?: boolean | null;
          language?: "en" | "fr" | "es" | null;
          location?: { lat: number; lng: number } | null;
          joined_at?: string;
        };
      };
      chats: {
        Row: {
          chat_id: string;
          member_ids: string[];
          is_group: boolean;
          title: string | null;
          created_at: string;
        };
        Insert: {
          chat_id: string;
          member_ids: string[];
          is_group: boolean;
          title?: string | null;
          created_at?: string;
        };
        Update: {
          member_ids?: string[];
          is_group?: boolean;
          title?: string | null;
          created_at?: string;
        };
      };
      hubs: {
        Row: {
          hub_id: string;
          name: string;
          location: { lat: number; lng: number };
          active_users: string[];
        };
        Insert: {
          hub_id: string;
          name: string;
          location: { lat: number; lng: number };
          active_users?: string[];
        };
        Update: {
          name?: string;
          location?: { lat: number; lng: number };
          active_users?: string[];
        };
      };
      messages: {
        Row: {
          message_id: string;
          chat_id: string;
          sender_id: string;
          content: string | null;
          attachments: ChatAttachmentPayload[] | null;
          metadata: Record<string, unknown> | null;
          is_silent: boolean | null;
          scheduled_for: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
          delivered_to: string[] | null;
          read_by: string[] | null;
          pinned: boolean | null;
        };
        Insert: {
          message_id: string;
          chat_id: string;
          sender_id: string;
          content?: string | null;
          attachments?: ChatAttachmentPayload[] | null;
          metadata?: Record<string, unknown> | null;
          is_silent?: boolean | null;
          scheduled_for?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
          delivered_to?: string[] | null;
          read_by?: string[] | null;
          pinned?: boolean | null;
        };
        Update: {
          content?: string | null;
          attachments?: ChatAttachmentPayload[] | null;
          metadata?: Record<string, unknown> | null;
          is_silent?: boolean | null;
          scheduled_for?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
          delivered_to?: string[] | null;
          read_by?: string[] | null;
          pinned?: boolean | null;
        };
      };
      message_reactions: {
        Row: {
          reaction_id: string;
          chat_id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          reaction_id?: string;
          chat_id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      message_reads: {
        Row: {
          chat_id: string;
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          chat_id: string;
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: Record<string, never>;
      };
      artworks: {
        Row: {
          artwork_id: string;
          artist_id: string;
          title: string;
          description: string | null;
          media_urls: string[];
          price: number;
          currency: string;
          is_sold: boolean;
          tags: string[];
          created_at: string;
        };
        Insert: {
          artwork_id: string;
          artist_id: string;
          title: string;
          description?: string | null;
          media_urls: string[];
          price: number;
          currency: string;
          is_sold?: boolean;
          tags: string[];
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          media_urls?: string[];
          price?: number;
          currency?: string;
          is_sold?: boolean;
          tags?: string[];
          created_at?: string;
        };
      };
      orders: {
        Row: {
          order_id: string;
          artwork_id: string;
          buyer_id: string;
          seller_id: string;
          amount: number;
          currency: string;
          status: "pending" | "paid" | "failed" | "refunded";
          stripe_payment_intent_id: string | null;
          created_at: string;
        };
        Insert: {
          order_id: string;
          artwork_id: string;
          buyer_id: string;
          seller_id: string;
          amount: number;
          currency: string;
          status: "pending" | "paid" | "failed" | "refunded";
          stripe_payment_intent_id?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "pending" | "paid" | "failed" | "refunded";
          stripe_payment_intent_id?: string | null;
          created_at?: string;
        };
      };
      events: {
        Row: {
          event_id: string;
          title: string;
          description: string | null;
          starts_at: string;
          ends_at: string | null;
          location: { lat: number; lng: number; address?: string } | null;
          host_user_id: string;
          attendees: string[] | null;
          created_at: string;
        };
        Insert: {
          event_id?: string;
          title: string;
          description?: string | null;
          starts_at: string;
          ends_at?: string | null;
          location?: { lat: number; lng: number; address?: string } | null;
          host_user_id: string;
          attendees?: string[] | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          location?: { lat: number; lng: number; address?: string } | null;
          host_user_id?: string;
          attendees?: string[] | null;
          created_at?: string;
        };
      };
    };
  };
};

export type ChatAttachmentPayload = {
  attachmentId: string;
  type: "image" | "video" | "audio" | "document" | "gif" | "sticker";
  url: string;
  name?: string;
  sizeBytes?: number;
  durationMs?: number;
  thumbnailUrl?: string | null;
};
