import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  await prisma.userProfile.update({
    where: { id: "main" },
    data: {
      age: null,
      weightKg: null,
      heightCm: null,
      activityLevel: null,
      biologicalSex: null,
      healthDataConsentAt: null,
    },
  });
  return NextResponse.json({ ok: true });
}
