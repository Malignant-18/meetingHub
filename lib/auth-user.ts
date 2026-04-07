import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

function buildDisplayName(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) return null;

  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");

  return user.username ?? null;
}

export async function getOrSyncUser(clerkUserId: string) {
  const clerk = await currentUser();

  const email =
    clerk?.primaryEmailAddress?.emailAddress ??
    clerk?.emailAddresses?.[0]?.emailAddress ??
    `${clerkUserId}@placeholder.local`;

  const name = buildDisplayName(clerk);

  return prisma.user.upsert({
    where: { clerkUserId },
    update: {
      email,
      name,
    },
    create: {
      clerkUserId,
      email,
      name,
    },
  });
}
