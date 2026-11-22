import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedEmail } from "@/lib/allowlist";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/acceso",
    error: "/acceso",
  },
  callbacks: {
    /**
     * Unica puerta de entrada a la app. Sin esto cualquier persona con una
     * cuenta de Google entraria: el proveedor solo prueba QUIEN eres, no que
     * tengas permiso. Google ya verifico el correo, pero `email_verified` se
     * revisa igual para no confiar en un perfil sin confirmar.
     */
    signIn({ profile }) {
      if (profile?.email_verified === false) return false;
      return isAllowedEmail(profile?.email, process.env.AUTH_ALLOWED_EMAIL);
    },
  },
});
