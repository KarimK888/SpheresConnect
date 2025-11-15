"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getBackend } from "@/lib/backend";
import type {
  HelpChat,
  HelpMessage,
  HelpModerationLog,
  HelpOffer,
  HelpRating,
  HelpRequest,
  HelpUser,
  HelpVerificationRecord
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const formatTimestamp = (value?: number) => {
  if (!value) return "just now";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
};

export const HelpCenterClient = () => {
  const backend = useMemo(() => getBackend(), []);
  const [users, setUsers] = useState<HelpUser[]>([]);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [offersByRequest, setOffersByRequest] = useState<Record<string, HelpOffer[]>>({});
  const [chatsByRequest, setChatsByRequest] = useState<Record<string, HelpChat[]>>({});
  const [messagesByChat, setMessagesByChat] = useState<Record<string, HelpMessage[]>>({});
  const [ratings, setRatings] = useState<HelpRating[]>([]);
  const [verifications, setVerifications] = useState<HelpVerificationRecord[]>([]);
  const [moderationLogs, setModerationLogs] = useState<HelpModerationLog[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [newRequest, setNewRequest] = useState({
    requesterId: "",
    title: "",
    description: "",
    category: "PRODUCTION",
    urgency: "MEDIUM",
    summary: ""
  });
  const [offerDrafts, setOfferDrafts] = useState<Record<string, { helperId: string; message: string }>>({});
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { helperId: string; score: number; feedback: string }>>({});
  const [verificationDraft, setVerificationDraft] = useState({ userId: "", type: "BACKGROUND" });
  const [moderationDraft, setModerationDraft] = useState({ entityType: "HelpOffer", entityId: "", action: "flagged", notes: "" });

  const loadUsers = useCallback(async () => {
    try {
      const list = await backend.helpCenter.users.list();
      setUsers(list);
      if (!newRequest.requesterId && list.length) {
        setNewRequest((prev) => ({ ...prev, requesterId: list[0].id }));
      }
      if (!verificationDraft.userId && list.length) {
        setVerificationDraft((prev) => ({ ...prev, userId: list[0].id }));
      }
    } catch (error) {
      console.error(error);
    }
  }, [backend.helpCenter.users, newRequest.requesterId, verificationDraft.userId]);

  const loadRequests = useCallback(async () => {
    try {
      const list = await backend.helpCenter.requests.list({ limit: 20 });
      setRequests(list);
    } catch (error) {
      console.error(error);
    }
  }, [backend.helpCenter.requests]);

  const loadOffers = useCallback(
    async (requestId: string) => {
      try {
        const offers = await backend.helpCenter.offers.listForRequest(requestId);
        setOffersByRequest((prev) => ({ ...prev, [requestId]: offers }));
      } catch (error) {
        console.error(error);
      }
    },
    [backend.helpCenter.offers]
  );

  const loadChats = useCallback(
    async (requestId: string) => {
      try {
        const chats = await backend.helpCenter.chats.listForRequest(requestId);
        setChatsByRequest((prev) => ({ ...prev, [requestId]: chats }));
        await Promise.all(
          chats.map(async (chat) => {
            const items = await backend.helpCenter.messages.list(chat.chatId);
            setMessagesByChat((prev) => ({ ...prev, [chat.chatId]: items }));
          })
        );
      } catch (error) {
        console.error(error);
      }
    },
    [backend.helpCenter.chats, backend.helpCenter.messages]
  );

  const loadRatings = useCallback(async () => {
    try {
      const items = await backend.helpCenter.ratings.listForUser({});
      setRatings(items);
    } catch (error) {
      console.error(error);
    }
  }, [backend.helpCenter.ratings]);

  const loadVerifications = useCallback(async () => {
    try {
      const items = await backend.helpCenter.verification.list();
      setVerifications(items);
    } catch (error) {
      console.error(error);
    }
  }, [backend.helpCenter.verification]);

  const loadModerationLogs = useCallback(async () => {
    try {
      const items = await backend.helpCenter.moderation.list();
      setModerationLogs(items);
    } catch (error) {
      console.error(error);
    }
  }, [backend.helpCenter.moderation]);

  useEffect(() => {
    void loadUsers();
    void loadRequests();
    void loadRatings();
    void loadVerifications();
    void loadModerationLogs();
  }, [loadModerationLogs, loadRatings, loadRequests, loadUsers, loadVerifications]);

  const helperName = (id: string) => users.find((user) => user.id === id)?.fullName ?? id;

  const handleCreateRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newRequest.requesterId) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await backend.helpCenter.requests.create({
        requesterId: newRequest.requesterId,
        title: newRequest.title.trim(),
        description: newRequest.description.trim(),
        summary: newRequest.summary.trim(),
        category: newRequest.category as HelpRequest["category"],
        urgency: newRequest.urgency as HelpRequest["urgency"]
      });
      setStatusMessage("Help request created");
      setNewRequest((prev) => ({ ...prev, title: "", description: "", summary: "" }));
      await loadRequests();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to create request");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOffer = async (requestId: string) => {
    const draft = offerDrafts[requestId];
    if (!draft?.helperId || !draft.message.trim()) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await backend.helpCenter.offers.create({
        requestId,
        helperId: draft.helperId,
        message: draft.message.trim()
      });
      setStatusMessage("Offer sent");
      setOfferDrafts((prev) => ({ ...prev, [requestId]: { helperId: draft.helperId, message: "" } }));
      await loadOffers(requestId);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to send offer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async (chat: HelpChat) => {
    const draft = chatDrafts[chat.chatId];
    if (!draft?.trim()) return;
    setIsSaving(true);
    try {
      await backend.helpCenter.messages.send({
        chatId: chat.chatId,
        authorId: chat.helperId,
        content: draft.trim()
      });
      setChatDrafts((prev) => ({ ...prev, [chat.chatId]: "" }));
      await loadChats(chat.requestId);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to send message");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartChat = async (offer: HelpOffer, request: HelpRequest) => {
    setStatusMessage(null);
    try {
      await backend.helpCenter.chats.start({
        requestId: request.requestId,
        helperId: offer.helperId,
        requesterId: request.requesterId,
        consentLevel: "LIMITED"
      });
      setStatusMessage("Chat started");
      await loadChats(request.requestId);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to start chat");
    }
  };

  const handleAcceptOffer = async (offerId: string, requestId: string) => {
    setStatusMessage(null);
    try {
      await backend.helpCenter.offers.updateStatus(offerId, "ACCEPTED");
      setStatusMessage("Offer accepted");
      await Promise.all([loadOffers(requestId), loadRequests()]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to update offer");
    }
  };

  const handleSubmitRating = async (requestId: string) => {
    const draft = ratingDrafts[requestId];
    if (!draft?.helperId || !draft.score) return;
    setStatusMessage(null);
    try {
      await backend.helpCenter.ratings.submit({
        requestId,
        helperId: draft.helperId,
        requesterId: requests.find((req) => req.requestId === requestId)?.requesterId ?? draft.helperId,
        score: draft.score,
        feedback: draft.feedback
      });
      setStatusMessage("Rating recorded");
      setRatingDrafts((prev) => ({ ...prev, [requestId]: { helperId: draft.helperId, score: 5, feedback: "" } }));
      await loadRatings();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to submit rating");
    }
  };

  const handleSubmitVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!verificationDraft.userId) return;
    setStatusMessage(null);
    try {
      await backend.helpCenter.verification.submit({
        userId: verificationDraft.userId,
        type: verificationDraft.type
      });
      setStatusMessage("Verification submitted");
      await loadVerifications();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to submit verification");
    }
  };

  const handleLogModeration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!moderationDraft.entityId.trim()) return;
    setStatusMessage(null);
    try {
      await backend.helpCenter.moderation.log({
        entityType: moderationDraft.entityType,
        entityId: moderationDraft.entityId.trim(),
        action: moderationDraft.action,
        notes: moderationDraft.notes
      });
      setStatusMessage("Moderation log created");
      setModerationDraft((prev) => ({ ...prev, entityId: "", notes: "" }));
      await loadModerationLogs();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to log moderation");
    }
  };

  const averageScoreForHelper = (helperId: string) => {
    const helperRatings = ratings.filter((rating) => rating.helperId === helperId);
    if (!helperRatings.length) return null;
    const total = helperRatings.reduce((sum, rating) => sum + rating.score, 0);
    return (total / helperRatings.length).toFixed(1);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Mutual Aid Help Center</h1>
        <p className="text-muted-foreground">
          Coordinate urgent help requests, surface trusted helpers, and keep moderation + verification logs alongside the
          core marketplace.
        </p>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-border/60 bg-accent/10 p-3 text-sm text-accent-foreground">{statusMessage}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create help request</CardTitle>
            <CardDescription>Publish rapid-response requests without touching the existing marketplace flow.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleCreateRequest}>
              <Label className="flex flex-col gap-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Requester
                <select
                  className="rounded-xl border border-border bg-background/60 p-2 text-sm text-white"
                  value={newRequest.requesterId}
                  onChange={(event) => setNewRequest((prev) => ({ ...prev, requesterId: event.target.value }))}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName ?? user.email}
                    </option>
                  ))}
                </select>
              </Label>
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Title
                <Input value={newRequest.title} onChange={(event) => setNewRequest((prev) => ({ ...prev, title: event.target.value }))} />
              </Label>
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Summary
                <Input
                  value={newRequest.summary}
                  onChange={(event) => setNewRequest((prev) => ({ ...prev, summary: event.target.value }))}
                />
              </Label>
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Description
                <Textarea
                  value={newRequest.description}
                  onChange={(event) => setNewRequest((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                />
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Category
                  <select
                    className="mt-1 rounded-xl border border-border bg-background/60 p-2 text-sm text-white"
                    value={newRequest.category}
                    onChange={(event) => setNewRequest((prev) => ({ ...prev, category: event.target.value }))}
                  >
                    {["PRODUCTION", "SAFETY", "ADVOCACY", "FUNDRAISING", "LOGISTICS"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Label>
                <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Urgency
                  <select
                    className="mt-1 rounded-xl border border-border bg-background/60 p-2 text-sm text-white"
                    value={newRequest.urgency}
                    onChange={(event) => setNewRequest((prev) => ({ ...prev, urgency: event.target.value }))}
                  >
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Label>
              </div>
              <Button type="submit" disabled={isSaving || !newRequest.title.trim() || !newRequest.description.trim()}>
                Launch request
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Helper directory</CardTitle>
            <CardDescription>All helper-only profiles live alongside existing artists without breaking user flows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="rounded-xl border border-border/40 bg-background/60 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white">{user.fullName ?? user.email}</p>
                  <Badge variant="outline">{user.trustLevel}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{user.about}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>Radius: {user.radiusPreference}km</span>
                  <span>Phone verified: {user.phoneVerified ? "yes" : "no"}</span>
                  {averageScoreForHelper(user.id) && <span>Avg rating: {averageScoreForHelper(user.id)}</span>}
                </div>
              </div>
            ))}
            {!users.length && <p className="text-sm text-muted-foreground">No helper profiles yet.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Active requests</h2>
          <Button variant="secondary" onClick={() => void loadRequests()}>
            Refresh
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {requests.map((request) => (
            <Card key={request.requestId} className="border-accent/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{request.title}</CardTitle>
                  <Badge>{request.status}</Badge>
                </div>
                <CardDescription>{request.description}</CardDescription>
                <div className="text-xs text-muted-foreground">
                  Posted {formatTimestamp(request.createdAt)} • {request.category} • {request.urgency}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Offers</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void loadOffers(request.requestId);
                        void loadChats(request.requestId);
                      }}
                    >
                      Sync
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(offersByRequest[request.requestId] ?? []).map((offer) => (
                      <div key={offer.offerId} className="rounded-xl border border-border/40 p-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-white">{helperName(offer.helperId)}</span>
                          <Badge variant="outline">{offer.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{offer.message}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleAcceptOffer(offer.offerId, request.requestId)}
                          >
                            Accept offer
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void handleStartChat(offer, request)}>
                            Start chat
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-dashed border-border/40 p-3 text-sm">
                    <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">New offer</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        className="rounded-xl border border-border bg-background/60 p-2 text-sm text-white"
                        value={offerDrafts[request.requestId]?.helperId ?? users[0]?.id ?? ""}
                        onChange={(event) =>
                          setOfferDrafts((prev) => ({
                            ...prev,
                            [request.requestId]: {
                              helperId: event.target.value,
                              message: prev[request.requestId]?.message ?? ""
                            }
                          }))
                        }
                      >
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName ?? user.email}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="short message"
                        value={offerDrafts[request.requestId]?.message ?? ""}
                        onChange={(event) =>
                          setOfferDrafts((prev) => ({
                            ...prev,
                            [request.requestId]: {
                              helperId: prev[request.requestId]?.helperId ?? users[0]?.id ?? "",
                              message: event.target.value
                            }
                          }))
                        }
                      />
                    </div>
                    <Button className="mt-2" variant="secondary" onClick={() => void handleCreateOffer(request.requestId)}>
                      Send offer
                    </Button>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white">Chats</h3>
                  <div className="space-y-3">
                    {(chatsByRequest[request.requestId] ?? []).map((chat) => (
                      <div key={chat.chatId} className="rounded-xl border border-border/40 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">Chat with {helperName(chat.helperId)}</span>
                          <Badge variant="outline">{chat.consentLevel}</Badge>
                        </div>
                        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-black/20 p-2 text-xs text-muted-foreground">
                          {(messagesByChat[chat.chatId] ?? []).map((message) => (
                            <p key={message.messageId}>
                              <span className="text-white">{helperName(message.authorId)}:</span> {message.content}
                            </p>
                          ))}
                          {!(messagesByChat[chat.chatId]?.length ?? 0) && <p>No messages yet.</p>}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Input
                            placeholder="Send update…"
                            value={chatDrafts[chat.chatId] ?? ""}
                            onChange={(event) =>
                              setChatDrafts((prev) => ({ ...prev, [chat.chatId]: event.target.value }))
                            }
                          />
                          <Button size="sm" onClick={() => void handleSendMessage(chat)}>
                            Send
                          </Button>
                        </div>
                      </div>
                    ))}
                    {!(chatsByRequest[request.requestId]?.length ?? 0) && (
                      <p className="text-sm text-muted-foreground">No chats in this thread yet.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white">Rate helper impact</h3>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <select
                      className="rounded-xl border border-border bg-background/60 p-2 text-sm text-white"
                      value={ratingDrafts[request.requestId]?.helperId ?? users[0]?.id ?? ""}
                      onChange={(event) =>
                        setRatingDrafts((prev) => ({
                          ...prev,
                          [request.requestId]: {
                            helperId: event.target.value,
                            score: prev[request.requestId]?.score ?? 5,
                            feedback: prev[request.requestId]?.feedback ?? ""
                          }
                        }))
                      }
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName ?? user.email}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={ratingDrafts[request.requestId]?.score ?? 5}
                      onChange={(event) =>
                        setRatingDrafts((prev) => ({
                          ...prev,
                          [request.requestId]: {
                            helperId: prev[request.requestId]?.helperId ?? users[0]?.id ?? "",
                            score: Number(event.target.value),
                            feedback: prev[request.requestId]?.feedback ?? ""
                          }
                        }))
                      }
                    />
                    <Input
                      placeholder="Feedback"
                      value={ratingDrafts[request.requestId]?.feedback ?? ""}
                      onChange={(event) =>
                        setRatingDrafts((prev) => ({
                          ...prev,
                          [request.requestId]: {
                            helperId: prev[request.requestId]?.helperId ?? users[0]?.id ?? "",
                            score: prev[request.requestId]?.score ?? 5,
                            feedback: event.target.value
                          }
                        }))
                      }
                    />
                  </div>
                  <Button className="mt-2" variant="outline" onClick={() => void handleSubmitRating(request.requestId)}>
                    Record rating
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!requests.length && <p className="text-sm text-muted-foreground">No active requests yet.</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Verification queue</CardTitle>
            <CardDescription>Lightweight vetting for helper identities, separate from artist verification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-2 sm:grid-cols-3" onSubmit={handleSubmitVerification}>
              <select
                className="rounded-xl border border-border bg-background/60 p-2 text-sm text-white"
                value={verificationDraft.userId}
                onChange={(event) => setVerificationDraft((prev) => ({ ...prev, userId: event.target.value }))}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName ?? user.email}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Type (eg. SAFETY)"
                value={verificationDraft.type}
                onChange={(event) => setVerificationDraft((prev) => ({ ...prev, type: event.target.value }))}
              />
              <Button type="submit" variant="secondary">
                Submit
              </Button>
            </form>
            <div className="space-y-2">
              {verifications.map((entry) => (
                <div key={entry.verificationId} className="rounded-xl border border-border/40 bg-background/60 p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white">{helperName(entry.userId)}</span>
                    <Badge variant="outline">{entry.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.type}</p>
                </div>
              ))}
              {!verifications.length && <p className="text-sm text-muted-foreground">No verification records yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moderation log</CardTitle>
            <CardDescription>Audit helper activity without touching the existing global moderation queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-2" onSubmit={handleLogModeration}>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Entity type"
                  value={moderationDraft.entityType}
                  onChange={(event) => setModerationDraft((prev) => ({ ...prev, entityType: event.target.value }))}
                />
                <Input
                  placeholder="Entity ID"
                  value={moderationDraft.entityId}
                  onChange={(event) => setModerationDraft((prev) => ({ ...prev, entityId: event.target.value }))}
                />
                <Input
                  placeholder="Action"
                  value={moderationDraft.action}
                  onChange={(event) => setModerationDraft((prev) => ({ ...prev, action: event.target.value }))}
                />
              </div>
              <Textarea
                rows={2}
                placeholder="Notes"
                value={moderationDraft.notes}
                onChange={(event) => setModerationDraft((prev) => ({ ...prev, notes: event.target.value }))}
              />
              <Button type="submit" variant="outline">
                Log entry
              </Button>
            </form>
            <div className="space-y-2">
              {moderationLogs.map((log) => (
                <div key={log.moderationId} className="rounded-xl border border-border/40 bg-background/60 p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">
                      {log.entityType} • {log.action}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatTimestamp(log.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{log.notes}</p>
                </div>
              ))}
              {!moderationLogs.length && <p className="text-sm text-muted-foreground">No moderation events recorded.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
