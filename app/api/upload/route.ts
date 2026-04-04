// app/api/upload/route.ts
// Handles transcript file upload:
// 1. Validates auth + file
// 2. Uploads raw file to Supabase Storage
// 3. Parses transcript into segments
// 4. Saves meeting + segments to Postgres via Prisma

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, TRANSCRIPTS_BUCKET } from "@/lib/supabase";
import { parseTranscript, validateTranscriptFile } from "@/lib/parser";

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // ─── Parse multipart form ──────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const title =
      (formData.get("title") as string | null) ?? "Untitled Meeting";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "projectId is required" },
        { status: 400 },
      );
    }

    // ─── Validate file ─────────────────────────────────────────────────
    const validationError = validateTranscriptFile(file);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    // ─── Verify project ownership ──────────────────────────────────────
    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
    });
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    // ─── Read file content ─────────────────────────────────────────────
    const buffer = await file.arrayBuffer();
    const content = new TextDecoder("utf-8").decode(buffer);

    // ─── Upload to Supabase Storage ────────────────────────────────────
    const storageClient = supabaseAdmin();
    const storagePath = `${user.id}/${projectId}/${Date.now()}-${file.name}`;

    const { error: storageError } = await storageClient.storage
      .from(TRANSCRIPTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || "text/plain",
        upsert: false,
      });

    if (storageError) {
      console.error("[upload] Supabase storage error:", storageError);
      // Don't fail the whole upload if storage fails — still parse and save
    }

    const { data: urlData } = storageClient.storage
      .from(TRANSCRIPTS_BUCKET)
      .getPublicUrl(storagePath);

    const fileUrl = urlData?.publicUrl ?? null;

    // ─── Parse transcript ──────────────────────────────────────────────
    const parsed = parseTranscript(content, file.name);

    // ─── Save to database (transaction) ───────────────────────────────
    const meeting = await prisma.$transaction(async (tx) => {
      // Create meeting record
      const newMeeting = await tx.meeting.create({
        data: {
          projectId,
          title,
          fileName: file.name,
          fileUrl,
          speakerCount: parsed.speakerCount,
          wordCount: parsed.wordCount,
          status: "PARSED",
        },
      });

      // Bulk insert segments (batch to avoid hitting limits)
      const BATCH_SIZE = 100;
      for (let i = 0; i < parsed.segments.length; i += BATCH_SIZE) {
        const batch = parsed.segments.slice(i, i + BATCH_SIZE);
        await tx.transcriptSegment.createMany({
          data: batch.map((seg) => ({
            meetingId: newMeeting.id,
            speaker: seg.speaker,
            text: seg.text,
            startTime: seg.startTime,
            endTime: seg.endTime,
            sequence: seg.sequence,
          })),
        });
      }

      return newMeeting;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          meetingId: meeting.id,
          title: meeting.title,
          fileName: meeting.fileName,
          speakerCount: parsed.speakerCount,
          wordCount: parsed.wordCount,
          segmentCount: parsed.segments.length,
          speakers: parsed.speakers,
          fileUrl,
        },
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Upload failed" },
      { status: 500 },
    );
  }
}
