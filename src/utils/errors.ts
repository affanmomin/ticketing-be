export const httpError = (status: number, code: string, message: string) => {
  const e: any = new Error(message);
  e.statusCode = status;
  e.code = code;
  return e;
};

export const badRequest = (m: string) => httpError(400, 'BAD_REQUEST', m);
export const unauthorized = (m: string) => httpError(401, 'UNAUTHORIZED', m);
export const forbidden = (m: string) => httpError(403, 'FORBIDDEN', m);
export const notFound = (m: string) => httpError(404, 'NOT_FOUND', m);
