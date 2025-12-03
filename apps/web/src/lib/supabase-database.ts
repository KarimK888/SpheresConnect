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
          role: "member" | "moderator" | "admin" | null;
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
          role?: "member" | "moderator" | "admin" | null;
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
          role?: "member" | "moderator" | "admin" | null;
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
          metadata: Record<string, unknown> | null;
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
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          status?: "pending" | "paid" | "failed" | "refunded";
          stripe_payment_intent_id?: string | null;
          created_at?: string;
          metadata?: Record<string, unknown> | null;
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
          location: { lat?: number; lng?: number; address?: string } | null;
          host_user_id: string;
          attendees: string[] | null;
          pending_attendees: string[] | null;
          created_at: string;
        };
        Insert: {
          event_id?: string;
          title: string;
          description?: string | null;
          starts_at: string;
          ends_at?: string | null;
          location?: { lat?: number; lng?: number; address?: string } | null;
          host_user_id: string;
          attendees?: string[] | null;
          pending_attendees?: string[] | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          location?: { lat?: number; lng?: number; address?: string } | null;
          host_user_id?: string;
          attendees?: string[] | null;
          pending_attendees?: string[] | null;
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
      productivity_boards: {
        Row: {
          board_id: string;
          user_id: string;
          title: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          board_id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          title?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      productivity_columns: {
        Row: {
          column_id: string;
          board_id: string;
          title: string;
          position: number;
          color: string | null;
          created_at: string;
        };
        Insert: {
          column_id?: string;
          board_id: string;
          title: string;
          position?: number;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          board_id?: string;
          title?: string;
          position?: number;
          color?: string | null;
          created_at?: string;
        };
      };
      productivity_cards: {
        Row: {
          card_id: string;
          column_id: string;
          title: string;
          description: string | null;
          labels: string[] | null;
          due_date: string | null;
          assignees: string[] | null;
          metadata: Record<string, unknown> | null;
          position: number;
          priority: string;
          created_at: string;
        };
        Insert: {
          card_id?: string;
          column_id: string;
          title: string;
          description?: string | null;
          labels?: string[] | null;
          due_date?: string | null;
          assignees?: string[] | null;
          metadata?: Record<string, unknown> | null;
          position?: number;
          priority?: string;
          created_at?: string;
        };
        Update: {
          column_id?: string;
          title?: string;
          description?: string | null;
          labels?: string[] | null;
          due_date?: string | null;
          assignees?: string[] | null;
          metadata?: Record<string, unknown> | null;
          position?: number;
          priority?: string;
          created_at?: string;
        };
      };
      productivity_todos: {
        Row: {
          todo_id: string;
          user_id: string;
          title: string;
          completed: boolean;
          due_date: string | null;
          tags: string[] | null;
          priority: string;
          created_at: string;
        };
        Insert: {
          todo_id?: string;
          user_id: string;
          title: string;
          completed?: boolean;
          due_date?: string | null;
          tags?: string[] | null;
          priority?: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          title?: string;
          completed?: boolean;
          due_date?: string | null;
          tags?: string[] | null;
          priority?: string;
          created_at?: string;
        };
      };
      productivity_events: {
        Row: {
          event_id: string;
          user_id: string;
          title: string;
          description: string | null;
          start_at: string;
          end_at: string | null;
          location: string | null;
          color: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          event_id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          start_at: string;
          end_at?: string | null;
          location?: string | null;
          color?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          title?: string;
          description?: string | null;
          start_at?: string;
          end_at?: string | null;
          location?: string | null;
          color?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
      productivity_comments: {
        Row: {
          comment_id: string;
          entity_type: string;
          entity_id: string;
          user_id: string;
          author_name: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          comment_id?: string;
          entity_type: string;
          entity_id: string;
          user_id: string;
          author_name?: string | null;
          body: string;
          created_at?: string;
        };
        Update: {
          entity_type?: string;
          entity_id?: string;
          user_id?: string;
          author_name?: string | null;
          body?: string;
          created_at?: string;
        };
      };
      "Chat": {
        Row: {
          id: string;
          requestId: string;
          helperId: string;
          requesterId: string;
          consentLevel: string;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          requestId: string;
          helperId: string;
          requesterId: string;
          consentLevel?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          requestId?: string;
          helperId?: string;
          requesterId?: string;
          consentLevel?: string;
          createdAt?: string;
          updatedAt?: string;
        };
      };
      HelpOffer: {
        Row: {
          id: string;
          helperId: string;
          requestId: string;
          message: string;
          status: string;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          helperId: string;
          requestId: string;
          message: string;
          status?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          helperId?: string;
          requestId?: string;
          message?: string;
          status?: string;
          createdAt?: string;
          updatedAt?: string;
        };
      };
      HelpRequest: {
        Row: {
          id: string;
          requesterId: string;
          title: string;
          description: string;
          summary: string | null;
          category: string;
          urgency: string;
          location: Record<string, unknown> | null;
          status: string;
          aiChecklist: Record<string, unknown> | null;
          aiRiskScore: number | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          requesterId: string;
          title: string;
          description: string;
          summary?: string | null;
          category: string;
          urgency: string;
          location?: Record<string, unknown> | null;
          status?: string;
          aiChecklist?: Record<string, unknown> | null;
          aiRiskScore?: number | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          requesterId?: string;
          title?: string;
          description?: string;
          summary?: string | null;
          category?: string;
          urgency?: string;
          location?: Record<string, unknown> | null;
          status?: string;
          aiChecklist?: Record<string, unknown> | null;
          aiRiskScore?: number | null;
          createdAt?: string;
          updatedAt?: string;
        };
      };
      Message: {
        Row: {
          id: string;
          chatId: string;
          authorId: string;
          content: string;
          aiRewrite: string | null;
          createdAt: string;
        };
        Insert: {
          id?: string;
          chatId: string;
          authorId: string;
          content: string;
          aiRewrite?: string | null;
          createdAt?: string;
        };
        Update: {
          chatId?: string;
          authorId?: string;
          content?: string;
          aiRewrite?: string | null;
          createdAt?: string;
        };
      };
      ModerationLog: {
        Row: {
          id: string;
          entityType: string;
          entityId: string;
          action: string;
          notes: string | null;
          createdAt: string;
          reviewedBy: string | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          entityType: string;
          entityId: string;
          action: string;
          notes?: string | null;
          createdAt?: string;
          reviewedBy?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          entityType?: string;
          entityId?: string;
          action?: string;
          notes?: string | null;
          createdAt?: string;
          reviewedBy?: string | null;
          metadata?: Record<string, unknown> | null;
        };
      };
      Rating: {
        Row: {
          id: string;
          score: number;
          feedback: string | null;
          helperId: string;
          requesterId: string;
          requestId: string;
          createdAt: string;
        };
        Insert: {
          id?: string;
          score: number;
          feedback?: string | null;
          helperId: string;
          requesterId: string;
          requestId: string;
          createdAt?: string;
        };
        Update: {
          score?: number;
          feedback?: string | null;
          helperId?: string;
          requesterId?: string;
          requestId?: string;
          createdAt?: string;
        };
      };
      "User": {
        Row: {
          id: string;
          email: string;
          fullName: string | null;
          avatarUrl: string | null;
          phoneVerified: boolean;
          idVerified: boolean;
          trustLevel: string;
          createdAt: string;
          updatedAt: string;
          about: string | null;
          aboutGenerated: string | null;
          location: string | null;
          phone: string | null;
          preferredCategories: string[] | null;
          profileTags: string[] | null;
          pronouns: string | null;
          publicProfile: boolean;
          radiusPreference: number;
        };
        Insert: {
          id?: string;
          email: string;
          fullName?: string | null;
          avatarUrl?: string | null;
          phoneVerified?: boolean;
          idVerified?: boolean;
          trustLevel?: string;
          createdAt?: string;
          updatedAt?: string;
          about?: string | null;
          aboutGenerated?: string | null;
          location?: string | null;
          phone?: string | null;
          preferredCategories?: string[] | null;
          profileTags?: string[] | null;
          pronouns?: string | null;
          publicProfile?: boolean;
          radiusPreference?: number;
        };
        Update: {
          email?: string;
          fullName?: string | null;
          avatarUrl?: string | null;
          phoneVerified?: boolean;
          idVerified?: boolean;
          trustLevel?: string;
          createdAt?: string;
          updatedAt?: string;
          about?: string | null;
          aboutGenerated?: string | null;
          location?: string | null;
          phone?: string | null;
          preferredCategories?: string[] | null;
          profileTags?: string[] | null;
          pronouns?: string | null;
          publicProfile?: boolean;
          radiusPreference?: number;
        };
      };
      Verification: {
        Row: {
          id: string;
          userId: string;
          type: string;
          status: string;
          metadata: Record<string, unknown> | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          userId: string;
          type: string;
          status?: string;
          metadata?: Record<string, unknown> | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          userId?: string;
          type?: string;
          status?: string;
          metadata?: Record<string, unknown> | null;
          createdAt?: string;
          updatedAt?: string;
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
