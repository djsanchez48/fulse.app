import { NextRequest, NextResponse } from "next/server";
import { detectIngredientsFromImage } from "@/lib/ai/vision";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "Se requiere una imagen en base64" },
        { status: 400 },
      );
    }

    const ingredients = await detectIngredientsFromImage(image);
    return NextResponse.json({ ingredients });
  } catch (error) {
    console.error("Vision error:", error);
    return NextResponse.json(
      { error: "Error al detectar ingredientes" },
      { status: 500 },
    );
  }
}
