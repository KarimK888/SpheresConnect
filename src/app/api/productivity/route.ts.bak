import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackend } from "@/lib/backend";
import {
  sampleProductivityBoards,
  sampleProductivityColumns,
  sampleProductivityCards,
  sampleProductivityTodos,
  sampleProductivityEvents,
  sampleProductivityComments
} from "@/lib/sample-data";
import type {
  ProductivityBoard,
  ProductivityCard,
  ProductivityColumn,
  ProductivityTodo,
  ProductivityCalendarEvent,
  ProductivityComment
} from "@/lib/types";

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("card.create"),
    data: z.object({
      columnId: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      labels: z.array(z.string()).optional(),
      dueDate: z.number().optional(),
      assignees: z.array(z.string()).optional(),
      metadata: z.record(z.any()).optional(),
      position: z.number().optional(),
      priority: z.enum(["low", "medium", "high"]).optional()
    })
  }),
  z.object({
    type: z.literal("card.move"),
    data: z.object({
      cardId: z.string(),
      columnId: z.string(),
      position: z.number().int()
    })
  }),
  z.object({
    type: z.literal("card.update"),
    data: z.object({
      cardId: z.string(),
      columnId: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      labels: z.array(z.string()).optional(),
      dueDate: z.number().optional(),
      assignees: z.array(z.string()).optional(),
      metadata: z.record(z.any()).optional(),
      position: z.number().optional(),
      priority: z.enum(["low", "medium", "high"]).optional()
    })
  }),
  z.object({
    type: z.literal("todo.create"),
    data: z.object({
      title: z.string().min(1),
      dueDate: z.number().optional(),
      tags: z.array(z.string()).optional(),
      priority: z.enum(["low", "medium", "high"]).optional()
    })
  }),
  z.object({
    type: z.literal("todo.update"),
    data: z.object({
      todoId: z.string(),
      title: z.string().optional(),
      dueDate: z.number().optional(),
      tags: z.array(z.string()).optional(),
      priority: z.enum(["low", "medium", "high"]).optional()
    })
  }),
  z.object({
    type: z.literal("todo.toggle"),
    data: z.object({
      todoId: z.string(),
      completed: z.boolean()
    })
  }),
  z.object({
    type: z.literal("todo.delete"),
    data: z.object({
      todoId: z.string()
    })
  }),
  z.object({
    type: z.literal("event.create"),
    data: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      startAt: z.number(),
      endAt: z.number().optional(),
      location: z.string().optional(),
      color: z.string().optional()
    })
  }),
  z.object({
    type: z.literal("event.update"),
    data: z.object({
      eventId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      startAt: z.number().optional(),
      endAt: z.number().optional(),
      location: z.string().optional(),
      color: z.string().optional(),
      metadata: z.record(z.any()).optional()
    })
  }),
  z.object({
    type: z.literal("event.delete"),
    data: z.object({
      eventId: z.string()
    })
  }),
  z.object({
    type: z.literal("comment.add"),
    data: z.object({
      entityType: z.enum(["card", "todo"]),
      entityId: z.string(),
      body: z.string().min(1),
      authorName: z.string().optional()
    })
  })
]);

export async function GET(request: Request) {
  const backend = getBackend();
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "userId required" } }, { status: 400 });
  }
  try {
    const snapshot = await backend.productivity.fetch(userId);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[productivity] fetch failed, returning placeholder:", error);
    return NextResponse.json(buildPlaceholderSnapshot(userId));
  }
}

const buildPlaceholderSnapshot = (userId: string) => {
  const board: ProductivityBoard = {
    ...sampleProductivityBoards[0],
    boardId: `placeholder_board_${userId}`,
    userId
  };
  const columns: ProductivityColumn[] = sampleProductivityColumns.map((column, index) => ({
    ...column,
    columnId: `placeholder_col_${index}_${userId}`,
    boardId: board.boardId
  }));
  const cards: ProductivityCard[] = sampleProductivityCards.map((card, index) => ({
    ...card,
    cardId: `placeholder_card_${index}_${userId}`,
    columnId: columns[index % columns.length].columnId
  }));
  const todos: ProductivityTodo[] = sampleProductivityTodos.map((todo, index) => ({
    ...todo,
    todoId: `placeholder_todo_${index}_${userId}`,
    userId
  }));
  const events: ProductivityCalendarEvent[] = sampleProductivityEvents.map((event, index) => ({
    ...event,
    eventId: `placeholder_event_${index}_${userId}`,
    userId
  }));
  const cardIds = new Set(cards.map((card) => card.cardId));
  const comments: ProductivityComment[] = sampleProductivityComments
    .filter((comment) => cardIds.has(comment.entityId))
    .map((comment, index) => ({
      ...comment,
      commentId: `placeholder_comment_${index}_${userId}`,
      entityId: cards[index % cards.length]?.cardId ?? cards[0]?.cardId ?? comment.entityId,
      userId
    }));
  return {
    boards: [board],
    columns,
    cards,
    todos,
    events,
    comments
  };
};

export async function POST(request: Request) {
  const backend = getBackend();
  const rawBody = await request.json();
  const payload = actionSchema.parse(rawBody);
  const session = await backend.auth.getSession();
  const derivedUserId = session?.user.userId ?? (typeof rawBody.userId === "string" ? rawBody.userId : null);
  if (!derivedUserId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Login required" } }, { status: 401 });
  }
  switch (payload.type) {
    case "card.create": {
      const card = await backend.productivity.createCard({
        ...payload.data,
        labels: payload.data.labels ?? [],
        assignees: payload.data.assignees ?? [],
        priority: payload.data.priority ?? "medium",
        userId: derivedUserId
      });
      return NextResponse.json(card, { status: 201 });
    }
    case "card.move": {
      const card = await backend.productivity.moveCard(payload.data);
      return NextResponse.json(card);
    }
    case "card.update": {
      const card = await backend.productivity.updateCard(payload.data.cardId, payload.data);
      return NextResponse.json(card);
    }
    case "todo.create": {
      const todo = await backend.productivity.createTodo({
        ...payload.data,
        userId: derivedUserId,
        tags: payload.data.tags ?? [],
        priority: payload.data.priority ?? "medium"
      });
      return NextResponse.json(todo, { status: 201 });
    }
    case "todo.update": {
      const todo = await backend.productivity.updateTodo(payload.data.todoId, payload.data);
      return NextResponse.json(todo);
    }
    case "todo.toggle": {
      const todo = await backend.productivity.toggleTodo(payload.data.todoId, payload.data.completed);
      return NextResponse.json(todo);
    }
    case "todo.delete": {
      await backend.productivity.deleteTodo(payload.data.todoId);
      return NextResponse.json({ ok: true });
    }
    case "event.create": {
      const event = await backend.productivity.createEvent({ ...payload.data, userId: derivedUserId });
      return NextResponse.json(event, { status: 201 });
    }
    case "event.update": {
      const event = await backend.productivity.updateEvent(payload.data.eventId, payload.data);
      return NextResponse.json(event);
    }
    case "event.delete": {
      await backend.productivity.deleteEvent(payload.data.eventId);
      return NextResponse.json({ ok: true });
    }
    case "comment.add": {
      const comment = await backend.productivity.addComment({
        ...payload.data,
        userId: derivedUserId
      });
      return NextResponse.json(comment, { status: 201 });
    }
    default:
      return NextResponse.json({ error: { code: "UNSUPPORTED", message: "Unsupported action" } }, { status: 400 });
  }
}
