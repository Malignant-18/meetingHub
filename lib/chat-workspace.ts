import { prisma } from "@/lib/prisma";
import { getOrSyncUser } from "@/lib/auth-user";

export async function getUserByClerkId(clerkUserId: string) {
  return getOrSyncUser(clerkUserId);
}

export async function getChatSidebarData(userId: string) {
  const [meetingChats, projectChats, projects] = await Promise.all([
    prisma.chat.findMany({
      where: {
        project: { ownerId: userId },
        scope: "MEETING",
      },
      include: {
        _count: { select: { messages: true } },
        contexts: {
          include: {
            meeting: {
              select: {
                id: true,
                title: true,
                fileName: true,
                createdAt: true,
              },
            },
          },
        },
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.chat.findMany({
      where: {
        project: { ownerId: userId },
        scope: "PROJECT",
      },
      include: {
        _count: { select: { messages: true } },
        contexts: {
          include: {
            meeting: {
              select: {
                id: true,
                title: true,
                fileName: true,
                createdAt: true,
              },
            },
          },
        },
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: { ownerId: userId },
      include: {
        meetings: {
          select: {
            id: true,
            title: true,
            fileName: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { meetingChats, projectChats, projects };
}

export async function getChatById(chatId: string, userId: string) {
  return prisma.chat.findFirst({
    where: {
      id: chatId,
      project: { ownerId: userId },
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          references: true,
          createdAt: true,
        },
      },
      contexts: {
        include: {
          meeting: {
            select: {
              id: true,
              title: true,
              fileName: true,
              createdAt: true,
            },
          },
        },
      },
      project: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
    },
  });
}

export async function getChatTranscriptSegments(
  chatId: string,
  userId: string,
) {
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      project: { ownerId: userId },
    },
    include: {
      contexts: { select: { meetingId: true } },
    },
  });

  if (!chat) return [];

  const meetingIds = chat.contexts.map((context) => context.meetingId);
  if (meetingIds.length === 0) return [];

  return prisma.transcriptSegment.findMany({
    where: { meetingId: { in: meetingIds } },
    include: {
      meeting: { select: { id: true, title: true, fileName: true } },
    },
    orderBy: [{ meetingId: "asc" }, { sequence: "asc" }],
  });
}
