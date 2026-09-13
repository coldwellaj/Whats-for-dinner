export {};

declare global {
  namespace Express {
    interface Request {
      userId: string;
      familyId: string | null;
    }
  }
}
