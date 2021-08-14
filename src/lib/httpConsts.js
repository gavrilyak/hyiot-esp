export const CONTENT_TYPE = "content-type";
export const CONTENT_LENGTH = "content-type";
export const APPLICATION_JSON = "application/json";
export const TEXT_PLAIN = "text/plain";

export const METHOD_NOT_ALLOWED = Object.freeze(
  {
    status: 405,
    headers: [CONTENT_TYPE, TEXT_PLAIN],
    body: "Method not allowed",
  },
  true
);

export const INVALID_REQUEST = Object.freeze(
  {
    status: 400,
    headers: [CONTENT_TYPE, TEXT_PLAIN],
    body: "Invalid request",
  },
  true
);

export const INTERNAL_ERROR = Object.freeze(
  {
    status: 500,
    headers: [CONTENT_TYPE, TEXT_PLAIN],
    body: "Interal error",
  },
  true
);

export const NOT_FOUND = Object.freeze(
  {
    status: 404,
    headers: [CONTENT_TYPE, TEXT_PLAIN],
    body: "Not found",
  },
  true
);

export const JSON_OK = Object.freeze(
  {
    status: 200,
    headers: [CONTENT_TYPE, APPLICATION_JSON],
    body: `{"ok": true}`,
  },
  true
);
