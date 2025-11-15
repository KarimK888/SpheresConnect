"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  KeyboardSensor
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Filter,
  Loader2,
  MessageSquare,
  PlusCircle,
  Sparkles,
  TrendingUp
} from "lucide-react";
import type {
  ProductivityBoard,
  ProductivityCard,
  ProductivityColumn,
  ProductivityTodo,
  ProductivityCalendarEvent,
  ProductivityComment
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type DueFilter,
  type PriorityFilter
} from "./preferences";

interface Snapshot {
  boards: ProductivityBoard[];
  columns: ProductivityColumn[];
  cards: ProductivityCard[];
  todos: ProductivityTodo[];
  events: ProductivityCalendarEvent[];
  comments: ProductivityComment[];
}

interface ProductivityClientProps {
  snapshot: Snapshot;
  userId?: string;
  onSnapshot?: () => Promise<void> | void;
}

type TaskSelection =
  | { type: "card"; task: ProductivityCard }
  | { type: "todo"; task: ProductivityTodo };

type TaskDetailPayload =
  | {
      type: "card";
      data: {
        cardId: string;
        columnId?: string;
        title?: string;
        description?: string;
        dueDate?: number;
        priority?: "low" | "medium" | "high";
      };
    }
  | {
      type: "todo";
      data: {
        todoId: string;
        title?: string;
        dueDate?: number;
        priority?: "low" | "medium" | "high";
      };
    };

interface CalendarTask {
  id: string;
  type: "card" | "todo";
  title: string;
  dueDate: number;
  priority: "low" | "medium" | "high";
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const priorityBadgeClasses: Record<"low" | "medium" | "high", string> = {
  low: "border-emerald-500/40 text-emerald-200",
  medium: "border-amber-500/40 text-amber-200",
  high: "border-rose-500/40 text-rose-200"
};

const priorityDotClasses: Record<"low" | "medium" | "high", string> = {
  low: "bg-emerald-400",
  medium: "bg-amber-400",
  high: "bg-rose-400"
};

const priorityCopy: Record<"low" | "medium" | "high", string> = {
  low: "Cruising",
  medium: "In flight",
  high: "Hot"
};

const dueFilterItems: { label: string; value: DueFilter }[] = [
  { label: "All due dates", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Overdue", value: "overdue" },
  { label: "No due date", value: "no-date" }
];

const priorityFilterItems: { label: string; value: PriorityFilter }[] = [
  { label: "All priorities", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" }
];

const toDateInputValue = (value?: number) => (value ? new Date(value).toISOString().split("T")[0] : "");

const formatShortDate = (value?: number) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No due date";

const getDueCategory = (value?: number): "overdue" | "upcoming" | "none" => {
  if (!value) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(value);
  due.setHours(0, 0, 0, 0);
  if (due < today) return "overdue";
  return "upcoming";
};

const matchesDueFilter = (value: number | undefined, filter: DueFilter) => {
  if (filter === "all") return true;
  if (filter === "no-date") return typeof value !== "number";
  if (typeof value !== "number") return false;
  const status = getDueCategory(value);
  return status === filter;
};

const matchesPriorityFilter = (priority: "low" | "medium" | "high", filter: PriorityFilter) =>
  filter === "all" || priority === filter;

const isWithinDays = (value: number, days: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const diff = date.getTime() - today.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
};

const dateKey = (value: number | Date) => new Date(value).toDateString();

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const compareByDue = <T extends { dueDate?: number; position?: number }>(a: T, b: T) => {
  const aDue = typeof a.dueDate === "number" ? a.dueDate : Number.POSITIVE_INFINITY;
  const bDue = typeof b.dueDate === "number" ? b.dueDate : Number.POSITIVE_INFINITY;
  if (aDue !== bDue) {
    return aDue - bDue;
  }
  return (a.position ?? 0) - (b.position ?? 0);
};

const deepClone = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const hasOwn = (obj: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

export const ProductivityClient = ({ snapshot, userId, onSnapshot }: ProductivityClientProps) => {
  const [data, setData] = useState(snapshot);
  const snapshotRef = useRef(snapshot);
  const refreshDebounceRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardForm, setCardForm] = useState({
    columnId: snapshot.columns[0]?.columnId ?? "",
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high"
  });
  const [todoForm, setTodoForm] = useState({ title: "", dueDate: "", priority: "medium" as "low" | "medium" | "high" });
  const [eventForm, setEventForm] = useState({ title: "", date: "", startTime: "09:00", endTime: "", location: "" });
  const [dueFilter, setDueFilter] = useState<DueFilter>(DEFAULT_PREFERENCES.dueFilter);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(DEFAULT_PREFERENCES.priorityFilter);
  const [selection, setSelection] = useState<TaskSelection | null>(null);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  });
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>(DEFAULT_PREFERENCES.collapsedColumns);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const currentUserId = userId ?? "local_user";

  useEffect(() => {
    const prefs = loadPreferences();
    setDueFilter(prefs.dueFilter);
    setPriorityFilter(prefs.priorityFilter);
    if (prefs.calendarCursor) {
      setCalendarCursor(prefs.calendarCursor);
    }
    setCollapsedColumns(prefs.collapsedColumns ?? {});
  }, []);

  useEffect(() => {
    savePreferences({
      dueFilter,
      priorityFilter,
      calendarCursor,
      collapsedColumns
    });
  }, [calendarCursor, collapsedColumns, dueFilter, priorityFilter]);

  useEffect(() => {
    setData(snapshot);
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    snapshotRef.current = data;
  }, [data]);

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns((prev) => {
      const next = { ...prev, [columnId]: !prev[columnId] };
      return next;
    });
  };

  useEffect(() => {
    if (!cardForm.columnId && data.columns.length) {
      setCardForm((prev) => ({ ...prev, columnId: data.columns[0]?.columnId ?? "" }));
    }
  }, [cardForm.columnId, data.columns]);

  useEffect(() => {
    if (!selection) return;
    if (selection.type === "card") {
      const fresh = data.cards.find((card) => card.cardId === selection.task.cardId);
      if (fresh && fresh !== selection.task) {
        setSelection({ type: "card", task: fresh });
      }
    } else {
      const fresh = data.todos.find((todo) => todo.todoId === selection.task.todoId);
      if (fresh && fresh !== selection.task) {
        setSelection({ type: "todo", task: fresh });
      }
    }
  }, [data.cards, data.todos, selection]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const board = data.boards[0];

  const columns = useMemo(() => {
    if (!board) return [];
    return data.columns.filter((column) => column.boardId === board.boardId).sort((a, b) => a.position - b.position);
  }, [board, data.columns]);

  const doneColumnIds = useMemo(() => {
    const ids = new Set<string>();
    columns.forEach((column) => {
      if (/done|complete/i.test(column.title)) {
        ids.add(column.columnId);
      }
    });
    return ids;
  }, [columns]);

  const commentsByEntity = useMemo(() => {
    const map = new Map<string, ProductivityComment[]>();
    data.comments
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((comment) => {
        const next = map.get(comment.entityId) ?? [];
        next.push(comment);
        map.set(comment.entityId, next);
      });
    return map;
  }, [data.comments]);

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, ProductivityCard[]>();
    columns.forEach((column) => map.set(column.columnId, []));
    data.cards.forEach((card) => {
      if (!matchesDueFilter(card.dueDate, dueFilter) || !matchesPriorityFilter(card.priority, priorityFilter)) {
        return;
      }
      const list = map.get(card.columnId);
      if (list) {
        list.push(card);
      }
    });
    columns.forEach((column) => {
      const list = map.get(column.columnId);
      if (list) {
        list.sort(compareByDue);
      }
    });
    return map;
  }, [columns, data.cards, dueFilter, priorityFilter]);

  const filteredTodos = useMemo(() => {
    return data.todos
      .filter((todo) => matchesDueFilter(todo.dueDate, dueFilter) && matchesPriorityFilter(todo.priority, priorityFilter))
      .sort(compareByDue);
  }, [data.todos, dueFilter, priorityFilter]);

  const calendarTasks = useMemo<CalendarTask[]>(() => {
    const cardTasks = data.cards
      .filter((card) => typeof card.dueDate === "number")
      .map((card) => ({
        id: card.cardId,
        type: "card" as const,
        title: card.title,
        dueDate: card.dueDate!,
        priority: card.priority
      }));
    const todoTasks = data.todos
      .filter((todo) => typeof todo.dueDate === "number")
      .map((todo) => ({
        id: todo.todoId,
        type: "todo" as const,
        title: todo.title,
        dueDate: todo.dueDate!,
        priority: todo.priority
      }));
    return [...cardTasks, ...todoTasks];
  }, [data.cards, data.todos]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    calendarTasks.forEach((task) => {
      const key = dateKey(task.dueDate);
      const bucket = map.get(key) ?? [];
      bucket.push(task);
      map.set(key, bucket);
    });
    return map;
  }, [calendarTasks]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ProductivityCalendarEvent[]>();
    data.events.forEach((event) => {
      const keys = [dateKey(event.startAt)];
      if (event.endAt) {
        keys.push(dateKey(event.endAt));
      }
      keys.forEach((key) => {
        const bucket = map.get(key) ?? [];
        bucket.push(event);
        map.set(key, bucket);
      });
    });
    return map;
  }, [data.events]);

  const currentMonth = useMemo(() => new Date(calendarCursor), [calendarCursor]);

  const calendarDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const offset = start.getDay();
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - offset);
    return Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = dateKey(date);
      return {
        key,
        date,
        inMonth: date.getMonth() === currentMonth.getMonth(),
        isToday: isSameDay(date, new Date()),
        tasks: tasksByDate.get(key) ?? [],
        events: eventsByDate.get(key) ?? []
      };
    });
  }, [currentMonth, eventsByDate, tasksByDate]);

  const sortedEvents = useMemo(
    () => data.events.slice().sort((a, b) => a.startAt - b.startAt),
    [data.events]
  );

  const stats = useMemo(() => {
    const completedCards = data.cards.filter((card) => doneColumnIds.has(card.columnId)).length;
    const overdueItems = calendarTasks.filter((task) => getDueCategory(task.dueDate) === "overdue").length;
    const upcomingWeek = calendarTasks.filter((task) => isWithinDays(task.dueDate, 7)).length;
    const completedTodos = data.todos.filter((todo) => todo.completed).length;
    return [
      {
        label: "Active cards",
        value: Math.max(data.cards.length - completedCards, 0).toString(),
        helper: "Currently in progress across your lanes.",
        icon: <TrendingUp className="h-4 w-4 text-accent" />
      },
      {
        label: "Shipped",
        value: completedCards.toString(),
        helper: "Cards sitting in Done / Completed columns.",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-300" />
      },
      {
        label: "Overdue",
        value: overdueItems.toString(),
        helper: "Tasks that slipped past their due date.",
        icon: <Filter className="h-4 w-4 text-rose-300" />
      },
      {
        label: "Todos",
        value: `${completedTodos}/${data.todos.length}`,
        helper: `${upcomingWeek} due in the next 7 days.`,
        icon: <Sparkles className="h-4 w-4 text-amber-200" />
      }
    ];
  }, [calendarTasks, data.cards, data.todos, doneColumnIds]);

  const selectedDayTasks = useMemo(
    () => (dayViewDate ? tasksByDate.get(dateKey(dayViewDate)) ?? [] : []),
    [dayViewDate, tasksByDate]
  );

  const selectedDayEvents = useMemo(
    () => (dayViewDate ? eventsByDate.get(dateKey(dayViewDate)) ?? [] : []),
    [dayViewDate, eventsByDate]
  );
  const refresh = useCallback(async () => {
    try {
      if (userId) {
        const response = await fetch(`/api/productivity?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as Snapshot;
          setData(payload);
          return;
        }
      }
      if (onSnapshot) {
        await onSnapshot();
      }
    } catch (error) {
      console.error("[productivity] refresh failed", error);
    }
  }, [onSnapshot, userId]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (typeof window === "undefined") return;
    if (refreshDebounceRef.current) {
      window.clearTimeout(refreshDebounceRef.current);
    }
    refreshDebounceRef.current = window.setTimeout(() => {
      refreshDebounceRef.current = null;
      void refresh();
    }, 400);
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const tables = ["productivity_cards", "productivity_todos", "productivity_events", "productivity_comments"];
    const channel = client.channel(`productivity:${userId}`);
    tables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => scheduleRealtimeRefresh());
    });
    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [scheduleRealtimeRefresh, userId]);

  useEffect(() => {
    return () => {
      if (refreshDebounceRef.current) {
        window.clearTimeout(refreshDebounceRef.current);
      }
    };
  }, []);

  const runAction = async (body: Record<string, unknown>, options?: { optimisticUpdater?: (draft: Snapshot) => void }) => {
    const optimisticUpdater = options?.optimisticUpdater;
    const rollback = optimisticUpdater ? deepClone(snapshotRef.current) : null;
    if (optimisticUpdater) {
      const draft = deepClone(snapshotRef.current);
      optimisticUpdater(draft);
      setData(draft);
      snapshotRef.current = draft;
    }
    setLoading(true);
    try {
      const payload = userId ? { ...body, userId } : body;
      const response = await fetch("/api/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => null);
        throw new Error(errorText || "Productivity mutation failed");
      }
      await refresh();
    } catch (error) {
      console.error("[productivity] mutation failed", error);
      if (rollback) {
        setData(rollback);
        snapshotRef.current = rollback;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async () => {
    if (!cardForm.title.trim() || !cardForm.columnId) return;
    const dueDate = cardForm.dueDate ? Date.parse(cardForm.dueDate) : undefined;
    const optimisticCard: ProductivityCard = {
      cardId: `optimistic_card_${Date.now()}`,
      columnId: cardForm.columnId,
      title: cardForm.title.trim(),
      description: cardForm.description.trim() || undefined,
      labels: [],
      dueDate,
      assignees: [],
      metadata: {},
      position: (cardsByColumn.get(cardForm.columnId)?.length ?? 0) + 1,
      priority: cardForm.priority,
      createdAt: Date.now()
    };
    await runAction(
      {
        type: "card.create",
        data: {
          columnId: cardForm.columnId,
          title: cardForm.title.trim(),
          description: cardForm.description.trim() || undefined,
          dueDate,
          priority: cardForm.priority
        }
      },
      {
        optimisticUpdater: (draft) => {
          draft.cards = [...draft.cards, optimisticCard];
        }
      }
    );
    setCardForm((prev) => ({ ...prev, title: "", description: "", dueDate: "" }));
  };

  const handleCreateTodo = async () => {
    if (!todoForm.title.trim()) return;
    const dueDate = todoForm.dueDate ? Date.parse(todoForm.dueDate) : undefined;
    const optimisticTodo: ProductivityTodo = {
      todoId: `optimistic_todo_${Date.now()}`,
      userId: currentUserId,
      title: todoForm.title.trim(),
      completed: false,
      dueDate,
      tags: [],
      priority: todoForm.priority,
      createdAt: Date.now()
    };
    await runAction(
      {
        type: "todo.create",
        data: {
          title: todoForm.title.trim(),
          dueDate,
          priority: todoForm.priority
        }
      },
      {
        optimisticUpdater: (draft) => {
          draft.todos = [...draft.todos, optimisticTodo];
        }
      }
    );
    setTodoForm({ title: "", dueDate: "", priority: todoForm.priority });
  };

  const toggleTodo = async (todoId: string, completed: boolean) => {
    await runAction(
      { type: "todo.toggle", data: { todoId, completed } },
      {
        optimisticUpdater: (draft) => {
          const target = draft.todos.find((todo) => todo.todoId === todoId);
          if (target) {
            target.completed = completed;
          }
        }
      }
    );
  };

  const handleAddEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) return;
    const startAt = Date.parse(`${eventForm.date}T${eventForm.startTime || "09:00"}`);
    const endAt = eventForm.endTime ? Date.parse(`${eventForm.date}T${eventForm.endTime}`) : undefined;
    const optimisticEvent: ProductivityCalendarEvent = {
      eventId: `optimistic_event_${Date.now()}`,
      userId: currentUserId,
      title: eventForm.title.trim(),
      description: undefined,
      startAt,
      endAt,
      location: eventForm.location.trim() || undefined,
      color: undefined,
      metadata: undefined,
      createdAt: Date.now()
    };
    await runAction(
      {
        type: "event.create",
        data: {
          title: eventForm.title.trim(),
          startAt,
          endAt,
          location: eventForm.location.trim() || undefined
        }
      },
      {
        optimisticUpdater: (draft) => {
          draft.events = [...draft.events, optimisticEvent];
        }
      }
    );
    setEventForm({ title: "", date: "", startTime: "09:00", endTime: "", location: "" });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCardId(null);
    const { active, over } = event;
    if (!over) return;
    const card = data.cards.find((item) => item.cardId === active.id);
    if (!card) return;
    const overData = over.data.current as { columnId?: string; sortable?: { index: number }; type?: string } | undefined;
    const targetColumnId =
      overData?.columnId ??
      (typeof over.id === "string"
        ? columns.find((column) => column.columnId === over.id)
          ? (over.id as string)
          : data.cards.find((item) => item.cardId === over.id)?.columnId
        : card.columnId);
    if (!targetColumnId) return;
    const siblingCards = data.cards
      .filter((item) => item.columnId === targetColumnId && item.cardId !== card.cardId)
      .sort((a, b) => a.position - b.position);
    const position =
      typeof overData?.sortable?.index === "number" ? overData.sortable.index : siblingCards.length;
    await runAction(
      {
        type: "card.move",
        data: { cardId: card.cardId, columnId: targetColumnId, position }
      },
      {
        optimisticUpdater: (draft) => {
          const moved = draft.cards.find((entry) => entry.cardId === card.cardId);
          if (moved) {
            moved.columnId = targetColumnId;
            moved.position = position;
          }
        }
      }
    );
  };

  const handleSaveTaskDetails = async (payload: TaskDetailPayload) => {
    await runAction(
      {
        type: payload.type === "card" ? "card.update" : "todo.update",
        data: payload.data
      },
      {
        optimisticUpdater: (draft) => {
          if (payload.type === "card") {
            const target = draft.cards.find((card) => card.cardId === payload.data.cardId);
            if (!target) return;
            const patch = payload.data;
            if (hasOwn(patch as Record<string, unknown>, "columnId") && patch.columnId) {
              target.columnId = patch.columnId;
            }
            if (hasOwn(patch as Record<string, unknown>, "title") && patch.title) {
              target.title = patch.title;
            }
            if (hasOwn(patch as Record<string, unknown>, "description")) {
              target.description = patch.description;
            }
            if (hasOwn(patch as Record<string, unknown>, "dueDate")) {
              target.dueDate = patch.dueDate;
            }
            if (hasOwn(patch as Record<string, unknown>, "priority") && patch.priority) {
              target.priority = patch.priority;
            }
          } else {
            const target = draft.todos.find((todo) => todo.todoId === payload.data.todoId);
            if (!target) return;
            const patch = payload.data;
            if (hasOwn(patch as Record<string, unknown>, "title") && patch.title) {
              target.title = patch.title;
            }
            if (hasOwn(patch as Record<string, unknown>, "dueDate")) {
              target.dueDate = patch.dueDate;
            }
            if (hasOwn(patch as Record<string, unknown>, "priority") && patch.priority) {
              target.priority = patch.priority;
            }
          }
        }
      }
    );
  };

  const handleAddComment = async (body: string, authorName?: string) => {
    if (!selection) return;
    const trimmedBody = body.trim();
    if (!trimmedBody) return;
    const entityId = selection.type === "card" ? selection.task.cardId : selection.task.todoId;
    const optimisticComment: ProductivityComment = {
      commentId: `optimistic_comment_${Date.now()}`,
      entityType: selection.type,
      entityId,
      userId: currentUserId,
      authorName: authorName?.trim() || undefined,
      body: trimmedBody,
      createdAt: Date.now()
    };
    await runAction(
      {
        type: "comment.add",
        data: {
          entityType: selection.type,
          entityId,
          body: trimmedBody,
          authorName
        }
      },
      {
        optimisticUpdater: (draft) => {
          draft.comments = [...draft.comments, optimisticComment];
        }
      }
    );
  };

  const moveMonth = (offset: number) => {
    setCalendarCursor((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next.toISOString();
    });
  };

  const handleDayClick = (date: Date) => {
    setDayViewDate((current) => (current && isSameDay(current, date) ? null : date));
  };

  const handleSelectFromCalendar = (task: CalendarTask) => {
    if (task.type === "card") {
      const card = data.cards.find((item) => item.cardId === task.id);
      if (card) {
        setSelection({ type: "card", task: card });
      }
    } else {
      const todo = data.todos.find((item) => item.todoId === task.id);
      if (todo) {
        setSelection({ type: "todo", task: todo });
      }
    }
  };

  const currentComments =
    selection && commentsByEntity.get(selection.type === "card" ? selection.task.cardId : selection.task.todoId);

  const activeCard = activeCardId ? data.cards.find((card) => card.cardId === activeCardId) : null;
  return (
    <>
      <div className="space-y-8">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Productivity</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">Studio productivity hub</h1>
              <p className="text-sm text-muted-foreground">
                Plan, drag, and sync every artifact directly with Supabase storage.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleManualRefresh()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Refresh data
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/60 bg-card/70 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white/10 p-2">{stat.icon}</div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{stat.helper}</p>
            </Card>
          ))}
        </div>

        <Card className="border-border/60 bg-card/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Filter className="h-4 w-4 text-accent" />
            Focus filters
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {dueFilterItems.map((item) => (
              <FilterChip key={item.value} active={item.value === dueFilter} label={item.label} onClick={() => setDueFilter(item.value)} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {priorityFilterItems.map((item) => (
              <FilterChip
                key={item.value}
                active={item.value === priorityFilter}
                label={item.label}
                onClick={() => setPriorityFilter(item.value)}
              />
            ))}
          </div>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[3fr,2fr]">
          <Card className="border-border/60 bg-card/70 p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Kanban board</h2>
                <p className="text-sm text-muted-foreground">Drag cards between stages or tap any card for details.</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {cardsByColumn.size ? "Filters apply to both board and todos." : "No columns available yet."}
              </p>
            </div>
            <form
              className="mt-4 space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateCard();
              }}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Card title"
                  value={cardForm.title}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, title: event.target.value }))}
                />
                <select
                  className="rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-white"
                  value={cardForm.columnId}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, columnId: event.target.value }))}
                >
                  {columns.map((column) => (
                    <option key={column.columnId} value={column.columnId}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </div>
              <Textarea
                placeholder="Optional description"
                value={cardForm.description}
                onChange={(event) => setCardForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  type="date"
                  value={cardForm.dueDate}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                />
                <select
                  className="rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-white"
                  value={cardForm.priority}
                  onChange={(event) =>
                    setCardForm((prev) => ({ ...prev, priority: event.target.value as "low" | "medium" | "high" }))
                  }
                >
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
                <Button type="submit" disabled={loading || !cardForm.title.trim()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add card
                </Button>
              </div>
            </form>

            <div className="mt-6 overflow-x-auto pb-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={(event) => void handleDragEnd(event)}
              >
                <div className="flex gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
                  {columns.map((column) => (
                    <KanbanColumn
                      key={column.columnId}
                      column={column}
                      cards={cardsByColumn.get(column.columnId) ?? []}
                      comments={commentsByEntity}
                      collapsed={Boolean(collapsedColumns[column.columnId])}
                      onToggleCollapse={() => toggleColumnCollapse(column.columnId)}
                      onSelectCard={(card) => setSelection({ type: "card", task: card })}
                    />
                  ))}
                </div>
                <DragOverlay>
                  {activeCard && (
                    <div className="w-72">
                      <KanbanCard
                        card={activeCard}
                        commentCount={commentsByEntity.get(activeCard.cardId)?.length ?? 0}
                        onSelect={() => undefined}
                        ghost
                      />
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/60 bg-card/70 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">To-do list</h2>
                <span className="text-xs text-muted-foreground">{filteredTodos.length} showing</span>
              </div>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreateTodo();
                }}
              >
                <Input
                  placeholder="Write a quick action item"
                  value={todoForm.title}
                  onChange={(event) => setTodoForm((prev) => ({ ...prev, title: event.target.value }))}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="date"
                    value={todoForm.dueDate}
                    onChange={(event) => setTodoForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  />
                  <select
                    className="rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-white"
                    value={todoForm.priority}
                    onChange={(event) =>
                      setTodoForm((prev) => ({ ...prev, priority: event.target.value as "low" | "medium" | "high" }))
                    }
                  >
                    <option value="high">High priority</option>
                    <option value="medium">Medium priority</option>
                    <option value="low">Low priority</option>
                  </select>
                </div>
                <Button type="submit" disabled={loading || !todoForm.title.trim()}>
                  Add to list
                </Button>
              </form>
              <div className="mt-5 space-y-3">
                {filteredTodos.map((todo) => (
                  <div
                    key={todo.todoId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelection({ type: "todo", task: todo })}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-border/40 bg-background/40 px-4 py-3 text-sm text-white transition hover:border-white/40"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border/50 bg-transparent"
                        checked={todo.completed}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => void toggleTodo(todo.todoId, event.target.checked)}
                      />
                      <div>
                        <p className={todo.completed ? "text-muted-foreground line-through" : "font-medium"}>{todo.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {todo.tags?.length ? todo.tags.slice(0, 2).join(", ") : "No tags"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px]">
                        {todo.dueDate ? formatShortDate(todo.dueDate) : "No date"}
                      </Badge>
                      <Badge variant="outline" className={`text-[11px] ${priorityBadgeClasses[todo.priority]}`}>
                        {priorityCopy[todo.priority]}
                      </Badge>
                    </div>
                  </div>
                ))}
                {!filteredTodos.length && (
                  <div className="rounded-2xl border border-dashed border-border/30 px-4 py-6 text-center text-xs text-muted-foreground">
                    No todos match the current filters.
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-border/60 bg-card/70 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Quick event</h2>
                <CalendarIcon className="h-5 w-5 text-accent" />
              </div>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAddEvent();
                }}
              >
                <Input
                  placeholder="Event title"
                  value={eventForm.title}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
                />
                <Input
                  type="date"
                  value={eventForm.date}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, date: event.target.value }))}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, startTime: event.target.value }))}
                  />
                  <Input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, endTime: event.target.value }))}
                  />
                </div>
                <Input
                  placeholder="Location / call link"
                  value={eventForm.location}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, location: event.target.value }))}
                />
                <Button type="submit" disabled={loading || !eventForm.title.trim() || !eventForm.date}>
                  Schedule
                </Button>
              </form>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="border-border/60 bg-card/70 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Calendar</h2>
                <p className="text-sm text-muted-foreground">Every card and todo with a due date lands on this grid.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button variant="ghost" size="sm" onClick={() => moveMonth(-1)}>
                  Previous
                </Button>
                <span className="text-white">{currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
                <Button variant="ghost" size="sm" onClick={() => moveMonth(1)}>
                  Next
                </Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {weekdayLabels.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {calendarDays.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => handleDayClick(day.date)}
                  className={`rounded-2xl border px-2 py-2 text-left transition ${
                    day.inMonth ? "border-border/40" : "border-border/10"
                  } ${dayViewDate && isSameDay(day.date, dayViewDate) ? "border-white/60 bg-white/5" : "bg-background/40"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${day.inMonth ? "text-white" : "text-muted-foreground/70"}`}>
                      {day.date.getDate()}
                    </span>
                    {day.isToday && <Badge variant="secondary" className="text-[10px]">Today</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {day.tasks.slice(0, 4).map((task) => (
                      <span key={task.id} className={`h-1.5 w-1.5 rounded-full ${priorityDotClasses[task.priority]}`} />
                    ))}
                  </div>
                  {day.events.length > 0 && (
                    <p className="mt-2 text-[10px] text-accent">{day.events.length} event{day.events.length > 1 ? "s" : ""}</p>
                  )}
                </button>
              ))}
            </div>
          </Card>
          <Card className="border-border/60 bg-card/70 p-5">
            <h3 className="text-xl font-semibold text-white">Upcoming events</h3>
            <div className="mt-4 space-y-3">
              {sortedEvents.length ? (
                sortedEvents.slice(0, 6).map((event) => (
                  <div key={event.eventId} className="rounded-2xl border border-border/30 bg-background/40 px-4 py-3 text-sm text-white">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{event.title}</p>
                      <Badge variant="outline" className="text-[11px]">
                        {new Date(event.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(event.startAt).toLocaleDateString()}</p>
                    {event.location && <p className="text-xs text-muted-foreground/80">{event.location}</p>}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/30 px-4 py-6 text-center text-xs text-muted-foreground">
                  Nothing on the books yet.
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
      {selection && (
        <TaskDetailModal
          selection={selection}
          columns={columns}
          comments={currentComments ?? []}
          loading={loading}
          onClose={() => setSelection(null)}
          onSave={(payload) => handleSaveTaskDetails(payload)}
          onAddComment={(body, author) => handleAddComment(body, author)}
          onToggleTodo={(todoId, completed) => toggleTodo(todoId, completed)}
        />
      )}

      {dayViewDate && (
        <DayPeek
          date={dayViewDate}
          tasks={selectedDayTasks}
          events={selectedDayEvents}
          onClose={() => setDayViewDate(null)}
          onSelectTask={handleSelectFromCalendar}
        />
      )}
    </>
  );
};

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const FilterChip = ({ label, active, onClick }: FilterChipProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`rounded-full border px-3 py-1 text-xs transition ${
      active ? "border-white bg-white/10 text-white" : "border-border/50 text-muted-foreground hover:border-white/40 hover:text-white"
    }`}
  >
    {label}
  </button>
);

interface KanbanColumnProps {
  column: ProductivityColumn;
  cards: ProductivityCard[];
  comments: Map<string, ProductivityComment[]>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectCard: (card: ProductivityCard) => void;
}

const KanbanColumn = ({ column, cards, comments, collapsed, onToggleCollapse, onSelectCard }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.columnId,
    data: { type: "column", columnId: column.columnId }
  });

  return (
    <Card className="flex min-w-[280px] flex-col border-border/50 bg-background/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-full border border-border/40 bg-background/60 p-1 text-xs text-muted-foreground transition hover:border-white/50 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <p className="text-sm font-semibold text-white">{column.title}</p>
        </div>
        <Badge variant="outline">{cards.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 rounded-2xl border px-3 py-2 transition ${
          isOver ? "border-white/40 bg-white/5" : "border-border/30"
        } ${collapsed ? "border-dashed opacity-60" : ""}`}
      >
        {!collapsed ? (
          <>
            <SortableContext
              id={column.columnId}
              items={cards.map((card) => card.cardId)}
              strategy={verticalListSortingStrategy}
            >
              {cards.map((card) => (
                <SortableCard
                  key={card.cardId}
                  card={card}
                  commentCount={comments.get(card.cardId)?.length ?? 0}
                  onSelect={() => onSelectCard(card)}
                />
              ))}
            </SortableContext>
            {!cards.length && (
              <div className="rounded-xl border border-dashed border-border/30 p-4 text-center text-xs text-muted-foreground">
                Drop or create a card
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border/30 p-4 text-center text-xs text-muted-foreground">
            Column collapsed
          </div>
        )}
      </div>
    </Card>
  );
};

interface SortableCardProps {
  card: ProductivityCard;
  commentCount: number;
  onSelect: () => void;
  ghost?: boolean;
}

const SortableCard = ({ card, commentCount, onSelect, ghost }: SortableCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.cardId,
    data: { type: "card", columnId: card.columnId }
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "z-10" : undefined} {...attributes} {...listeners}>
      <KanbanCard card={card} commentCount={commentCount} onSelect={onSelect} ghost={ghost} />
    </div>
  );
};

interface KanbanCardProps {
  card: ProductivityCard;
  commentCount: number;
  onSelect: () => void;
  ghost?: boolean;
}

const KanbanCard = ({ card, commentCount, onSelect, ghost }: KanbanCardProps) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onSelect}
    className={`rounded-2xl border border-border/40 bg-background/70 p-4 text-sm text-white transition hover:border-white/50 ${
      ghost ? "opacity-80 shadow-2xl" : ""
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <p className="font-semibold leading-snug">{card.title}</p>
      <Badge variant="outline" className={`text-[11px] ${priorityBadgeClasses[card.priority]}`}>
        {priorityCopy[card.priority]}
      </Badge>
    </div>
    {card.description && <p className="mt-2 text-xs text-muted-foreground">{card.description}</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      {card.labels?.map((label) => (
        <Badge key={label} variant="secondary" className="bg-white/10 text-[11px] text-white">
          {label}
        </Badge>
      ))}
      {card.dueDate && (
        <Badge variant="outline" className="text-[11px]">
          Due {formatShortDate(card.dueDate)}
        </Badge>
      )}
    </div>
    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
      <span>{card.assignees?.length ? `${card.assignees.length} assignee${card.assignees.length > 1 ? "s" : ""}` : "No assignee"}</span>
      <span className="inline-flex items-center gap-1">
        <MessageSquare className="h-3 w-3" />
        {commentCount}
      </span>
    </div>
  </div>
);
interface TaskDetailModalProps {
  selection: TaskSelection;
  columns: ProductivityColumn[];
  comments: ProductivityComment[];
  loading: boolean;
  onClose: () => void;
  onSave: (payload: TaskDetailPayload) => Promise<void>;
  onAddComment: (body: string, author?: string) => Promise<void>;
  onToggleTodo: (todoId: string, completed: boolean) => Promise<void>;
}

const TaskDetailModal = ({
  selection,
  columns,
  comments,
  loading,
  onClose,
  onSave,
  onAddComment,
  onToggleTodo
}: TaskDetailModalProps) => {
  const isCard = selection.type === "card";
  const cardTask: ProductivityCard | null = isCard ? (selection.task as ProductivityCard) : null;
  const todoTask: ProductivityTodo | null = !isCard ? (selection.task as ProductivityTodo) : null;
  const task = selection.task;
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(cardTask?.description ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueDate));
  const [priority, setPriority] = useState(task.priority);
  const [columnId, setColumnId] = useState(cardTask?.columnId ?? "");
  const [commentBody, setCommentBody] = useState("");
  const [authorName, setAuthorName] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(cardTask?.description ?? "");
    setDueDate(toDateInputValue(task.dueDate));
    setPriority(task.priority);
    setColumnId(cardTask?.columnId ?? "");
    setCommentBody("");
  }, [cardTask?.columnId, cardTask?.description, task]);

  const handleSave = async () => {
    if (!title.trim()) return;
    const parsedDueDate = dueDate ? Date.parse(dueDate) : undefined;

    if (cardTask) {
      const payload: TaskDetailPayload = {
        type: "card",
        data: {
          cardId: cardTask.cardId,
          columnId: columnId || cardTask.columnId,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: parsedDueDate,
          priority
        }
      };
      await onSave(payload);
      return;
    }

    if (!todoTask) {
      return;
    }

    const payload: TaskDetailPayload = {
      type: "todo",
      data: {
        todoId: todoTask.todoId,
        title: title.trim(),
        dueDate: parsedDueDate,
        priority
      }
    };
    await onSave(payload);
  };

  const handleAddComment = async () => {
    if (!commentBody.trim()) return;
    await onAddComment(commentBody.trim(), authorName.trim() || undefined);
    setCommentBody("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
      <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-border/70 bg-background/95 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Task details</p>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-3 text-xl font-semibold text-white"
            />
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {isCard && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Column</label>
                <select
                  className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-white"
                  value={columnId}
                  onChange={(event) => setColumnId(event.target.value)}
                >
                  {columns.map((column) => (
                    <option key={column.columnId} value={column.columnId}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Due date</label>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Priority</label>
              <select
                className="w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm text-white"
                value={priority}
                onChange={(event) => setPriority(event.target.value as "low" | "medium" | "high")}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            {!isCard && todoTask && (
              <Button variant="outline" onClick={() => void onToggleTodo(todoTask.todoId, !todoTask.completed)} disabled={loading}>
                {todoTask.completed ? "Re-open todo" : "Mark complete"}
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{isCard ? "Description" : "Notes"}</label>
            <Textarea
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add additional context for collaborators"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {isCard && cardTask?.labels?.length ? (
            cardTask.labels.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">{isCard ? "No labels" : "Todo"}</Badge>
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => void handleSave()} disabled={loading || !title.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
        <div className="mt-8 space-y-3">
          <p className="text-sm font-semibold text-white">Comments</p>
          {comments.length ? (
            comments.map((comment) => (
              <div key={comment.commentId} className="rounded-2xl border border-border/30 bg-background/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {comment.authorName ?? "Anonymous"} &middot; {new Date(comment.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
                <p className="mt-1 text-sm text-white">{comment.body}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No comments yet. Start the thread.</p>
          )}
          <div className="mt-4 space-y-2 rounded-2xl border border-border/40 bg-background/40 px-4 py-4">
            <Input
              placeholder="Your name"
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
            />
            <Textarea
              rows={3}
              placeholder="Share an update or question"
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
            />
            <Button type="button" onClick={() => void handleAddComment()} disabled={loading || !commentBody.trim()}>
              Post comment
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

interface DayPeekProps {
  date: Date;
  tasks: CalendarTask[];
  events: ProductivityCalendarEvent[];
  onClose: () => void;
  onSelectTask: (task: CalendarTask) => void;
}

const DayPeek = ({ date, tasks, events, onClose, onSelectTask }: DayPeekProps) => (
  <div className="fixed inset-x-4 bottom-4 z-40 md:inset-x-auto md:right-6 md:w-96">
    <Card className="border-primary/40 bg-background/95 p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Focus day</p>
          <p className="text-lg font-semibold text-white">
            {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tasks</p>
        {tasks.length ? (
          tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task)}
              className="w-full rounded-2xl border border-border/30 bg-card/60 px-3 py-2 text-left text-sm text-white hover:border-white/40"
            >
              <div className="flex items-center justify-between">
                <span>{task.title}</span>
                <Badge variant="outline" className={`text-[11px] ${priorityBadgeClasses[task.priority]}`}>
                  {priorityCopy[task.priority]}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{task.type === "card" ? "Board card" : "Todo"}</p>
            </button>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No tasks due on this date.</p>
        )}
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Events</p>
        {events.length ? (
          events.map((event) => (
            <div key={event.eventId} className="rounded-2xl border border-border/30 bg-card/50 px-3 py-2 text-sm text-white">
              <p className="font-medium">{event.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(event.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {event.endAt
                  ? ` – ${new Date(event.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No events on this day.</p>
        )}
      </div>
    </Card>
  </div>
);

