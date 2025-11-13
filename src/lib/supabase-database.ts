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
          profile: Record<string, unknown> | null;
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
          profile?: Record<string, unknown> | null;
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
          profile?: Record<string, unknown> | null;
        };
      };
      chats: {
        Row: {
          chat_id: string;
          member_ids: string[];
          is_group: boolean;
          title: string | null;
          created_at: string;
          archived_by: string[] | null;
          hidden_by: string[] | null;
        };
        Insert: {
          chat_id: string;
          member_ids: string[];
          is_group: boolean;
          title?: string | null;
          created_at?: string;
          archived_by?: string[] | null;
          hidden_by?: string[] | null;
        };
        Update: {
          member_ids?: string[];
          is_group?: boolean;
          title?: string | null;
          created_at?: string;
          archived_by?: string[] | null;
          hidden_by?: string[] | null;
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
      checkins: {
        Row: {
          checkin_id: string;
          user_id: string;
          hub_id: string | null;
          location: { lat: number; lng: number } | null;
          status: "online" | "offline" | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          checkin_id: string;
          user_id: string;
          hub_id?: string | null;
          location?: { lat: number; lng: number } | null;
          status?: "online" | "offline" | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          hub_id?: string | null;
          location?: { lat: number; lng: number } | null;
          status?: "online" | "offline" | null;
          expires_at?: string;
          created_at?: string;
        };
      };
      match_actions: {
        Row: {
          id: string;
          user_id: string;
          target_id: string;
          action: "connected" | "skipped";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_id: string;
          action: "connected" | "skipped";
          created_at?: string;
        };
        Update: {
          target_id?: string;
          action?: "connected" | "skipped";
          created_at?: string;
        };
      };
      profile_projects: {
        Row: {
          project_id: string;
          user_id: string;
          title: string;
          summary: string | null;
          link: string | null;
          status: "draft" | "live" | null;
          tags: string[] | null;
          year: number | null;
          created_at: string;
        };
        Insert: {
          project_id?: string;
          user_id: string;
          title: string;
          summary?: string | null;
          link?: string | null;
          status?: "draft" | "live" | null;
          tags?: string[] | null;
          year?: number | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          summary?: string | null;
          link?: string | null;
          status?: "draft" | "live" | null;
          tags?: string[] | null;
          year?: number | null;
          created_at?: string;
        };
      };
      profile_media: {
        Row: {
          media_id: string;
          user_id: string;
          project_id: string | null;
          type: "image" | "video" | "document";
          title: string | null;
          description: string | null;
          url: string;
          thumbnail_url: string | null;
          tags: string[] | null;
          created_at: string;
        };
        Insert: {
          media_id?: string;
          user_id: string;
          project_id?: string | null;
          type: "image" | "video" | "document";
          title?: string | null;
          description?: string | null;
          url: string;
          thumbnail_url?: string | null;
          tags?: string[] | null;
          created_at?: string;
        };
        Update: {
          project_id?: string | null;
          type?: "image" | "video" | "document";
          title?: string | null;
          description?: string | null;
          url?: string;
          thumbnail_url?: string | null;
          tags?: string[] | null;
          created_at?: string;
        };
      };
      profile_socials: {
        Row: {
          social_id: string;
          user_id: string;
          platform: string;
          handle: string | null;
          url: string | null;
          created_at: string;
        };
        Insert: {
          social_id?: string;
          user_id: string;
          platform: string;
          handle?: string | null;
          url?: string | null;
          created_at?: string;
        };
        Update: {
          platform?: string;
          handle?: string | null;
          url?: string | null;
          created_at?: string;
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
      order_milestones: {
        Row: {
          milestone_id: string;
          order_id: string;
          title: string;
          amount: number;
          due_date: string | null;
          status: "pending" | "submitted" | "approved" | "paid";
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          milestone_id?: string;
          order_id: string;
          title: string;
          amount: number;
          due_date?: string | null;
          status?: "pending" | "submitted" | "approved" | "paid";
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          title?: string;
          amount?: number;
          due_date?: string | null;
          status?: "pending" | "submitted" | "approved" | "paid";
          created_at?: string;
          updated_at?: string | null;
        };
      };
      payouts: {
        Row: {
          payout_id: string;
          order_id: string;
          milestone_id: string | null;
          payee_id: string;
          amount: number;
          currency: string;
          status: "initiated" | "processing" | "paid" | "failed";
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          payout_id?: string;
          order_id: string;
          milestone_id?: string | null;
          payee_id: string;
          amount: number;
          currency?: string;
          status?: "initiated" | "processing" | "paid" | "failed";
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          order_id?: string;
          milestone_id?: string | null;
          payee_id?: string;
          amount?: number;
          currency?: string;
          status?: "initiated" | "processing" | "paid" | "failed";
          metadata?: Record<string, unknown> | null;
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
      notifications: {
        Row: {
          notification_id: string;
          user_id: string;
          kind: string;
          title: string;
          body: string | null;
          link: string | null;
          link_label: string | null;
          secondary_link: string | null;
          secondary_link_label: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          notification_id?: string;
          user_id: string;
          kind?: string;
          title: string;
          body?: string | null;
          link?: string | null;
          link_label?: string | null;
          secondary_link?: string | null;
          secondary_link_label?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          kind?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          link_label?: string | null;
          secondary_link?: string | null;
          secondary_link_label?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          read_at?: string | null;
        };
      };
      verification_requests: {
        Row: {
          request_id: string;
          user_id: string;
          portfolio_url: string | null;
          statement: string | null;
          status: "pending" | "approved" | "rejected";
          reviewer_id: string | null;
          reviewed_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          request_id?: string;
          user_id: string;
          portfolio_url?: string | null;
          statement?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewer_id?: string | null;
          reviewed_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          portfolio_url?: string | null;
          statement?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewer_id?: string | null;
          reviewed_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      moderation_queue: {
        Row: {
          queue_id: string;
          resource_type: string;
          resource_id: string;
          reported_by: string | null;
          reason: string | null;
          status: "open" | "in_review" | "resolved";
          reviewer_id: string | null;
          reviewed_at: string | null;
          resolution: string | null;
          created_at: string;
        };
        Insert: {
          queue_id?: string;
          resource_type: string;
          resource_id: string;
          reported_by?: string | null;
          reason?: string | null;
          status?: "open" | "in_review" | "resolved";
          reviewer_id?: string | null;
          reviewed_at?: string | null;
          resolution?: string | null;
          created_at?: string;
        };
        Update: {
          resource_type?: string;
          resource_id?: string;
          reported_by?: string | null;
          reason?: string | null;
          status?: "open" | "in_review" | "resolved";
          reviewer_id?: string | null;
          reviewed_at?: string | null;
          resolution?: string | null;
          created_at?: string;
        };
      };
      support_tickets: {
        Row: {
          ticket_id: string;
          user_id: string | null;
          subject: string;
          body: string | null;
          status: "open" | "in_progress" | "closed";
          assigned_to: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          ticket_id?: string;
          user_id?: string | null;
          subject: string;
          body?: string | null;
          status?: "open" | "in_progress" | "closed";
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string | null;
          subject?: string;
          body?: string | null;
          status?: "open" | "in_progress" | "closed";
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string | null;
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
