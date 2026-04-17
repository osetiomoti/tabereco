export interface AuthContext {
  userId: string;
  cognitoSub: string;
  email: string;
  groupId: string | null;
  /** Cognito ID token (may be refreshed) — for Identity Pool credential exchange */
  idToken: string | null;
}
