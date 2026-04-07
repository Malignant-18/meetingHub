// app/api/projects/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrSyncUser } from '@/lib/auth-user'

// GET /api/projects — list all projects for current user
export async function GET() {
  try {
    const { userId: clerkUserId } = auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getOrSyncUser(clerkUserId)

    const projects = await prisma.project.findMany({
      where: { ownerId: user.id },
      include: { _count: { select: { meetings: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: projects })
  } catch (err) {
    console.error('[GET /api/projects]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects — create a new project
export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const name = body?.name?.trim()

    if (!name || name.length < 1) {
      return NextResponse.json({ success: false, error: 'Project name is required' }, { status: 400 })
    }
    if (name.length > 100) {
      return NextResponse.json({ success: false, error: 'Project name too long (max 100 chars)' }, { status: 400 })
    }

    // Upsert user (first time sign-in creates the user row)
    const user = await getOrSyncUser(clerkUserId)

    const project = await prisma.project.create({
      data: { name, ownerId: user.id },
    })

    return NextResponse.json({ success: true, data: project }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/projects]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
