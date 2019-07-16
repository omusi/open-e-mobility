import * as Express from 'express';
import UserToken from '../../src/types/UserToken';

declare module 'Express' {
  interface Request {
    locale: string;
    user?: UserToken;
  }
}
/*
declare global {
  namespace Express {
    interface Request {
      locale: string;
      user?: UserToken;
    }
  }
}
*/