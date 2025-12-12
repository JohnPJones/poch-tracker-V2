import NextAuth, { NextAuthOptions } from 'next-auth';

const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'line',
      name: 'LINE',
      type: 'oauth',
      issuer: 'https://access.line.me',
      authorization: {
        url: 'https://access.line.me/oauth2/v2.1/authorize',
        params: { scope: 'profile openid' },
      },
      token: 'https://api.line.me/oauth2/v2.1/token',
      userinfo: 'https://api.line.me/v2/profile',
      clientId: process.env.LINE_CHANNEL_ID!,
      clientSecret: process.env.LINE_CHANNEL_SECRET!,
      idToken: true,
      client: {
        id_token_signed_response_alg: 'HS256',
      },
      profile(profile: any) {
        return {
          id: profile.userId,
          name: profile.displayName,
          image: profile.pictureUrl,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };