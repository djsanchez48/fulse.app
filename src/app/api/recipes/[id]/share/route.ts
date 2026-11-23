import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateShareToken, shareUrl } from "@/lib/recipes/public-link";

function origen(req: NextRequest): string {
  return process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? req.nextUrl.origin;
}

/** Crea el link publico, o lo rota si ya existia (el anterior deja de servir). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const existing = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true, shareToken: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 });
    }

    const anterior = existing.shareToken;
    const token = generateShareToken();

    const recipe = await prisma.recipe.update({
      where: { id },
      data: { shareToken: token, sharedAt: new Date() },
      select: { shareToken: true, sharedAt: true },
    });

    // La pagina publica se sirve cacheada: hay que invalidar la del token viejo
    // para que un link rotado deje de responder desde el cache.
    if (anterior) revalidatePath(`/r/${anterior}`);
    revalidatePath(`/r/${token}`);

    return NextResponse.json({
      url: shareUrl(recipe.shareToken!, origen(req)),
      sharedAt: recipe.sharedAt,
    });
  } catch (error) {
    console.error("Share recipe error:", error);
    return NextResponse.json({ error: "No se pudo crear el link" }, { status: 500 });
  }
}

/** Revoca el link: el token desaparece y la pagina publica pasa a 404. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const existing = await prisma.recipe.findUnique({
      where: { id },
      select: { shareToken: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 });
    }

    await prisma.recipe.update({
      where: { id },
      data: { shareToken: null, sharedAt: null },
    });

    if (existing.shareToken) revalidatePath(`/r/${existing.shareToken}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Revoke share error:", error);
    return NextResponse.json({ error: "No se pudo revocar el link" }, { status: 500 });
  }
}
