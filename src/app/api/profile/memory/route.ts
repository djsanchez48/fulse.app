import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { id: "main" },
      select: { memoryProfile: true, memoryEnabled: true },
    });

    const recentEvents = await prisma.preferenceEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, entity: true, value: true, weight: true, createdAt: true },
    });

    return NextResponse.json({
      memoryProfile: profile?.memoryProfile ?? {},
      memoryEnabled: profile?.memoryEnabled ?? true,
      recentEvents,
    });
  } catch (error) {
    console.error("Get memory error:", error);
    return NextResponse.json({ error: "Error al obtener la memoria" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { memoryProfile } = body;

    await prisma.userProfile.update({
      where: { id: "main" },
      data: {
        memoryProfile: {
          ...(memoryProfile as object),
          updatedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update memory error:", error);
    return NextResponse.json({ error: "Error al actualizar la memoria" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.$transaction([
      prisma.preferenceEvent.deleteMany(),
      prisma.userProfile.update({
        where: { id: "main" },
        data: { memoryProfile: {} },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete memory error:", error);
    return NextResponse.json({ error: "Error al borrar la memoria" }, { status: 500 });
  }
}
