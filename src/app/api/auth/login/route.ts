import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { senha } = await req.json();

    if (!process.env.APP_SENHA) {
      return NextResponse.json(
        { error: "APP_SENHA não configurada." },
        { status: 500 }
      );
    }

    if (senha !== process.env.APP_SENHA) {
      return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set("jc_auth", "ok", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida." },
      { status: 400 }
    );
  }
}