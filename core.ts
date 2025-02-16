import qs from 'qs';

import type { Agent } from 'http';
import type { RequestInfo, RequestInit, Response } from 'node-fetch';
import { FormData, File, Blob } from 'formdata-node';
import { FormDataEncoder } from 'form-data-encoder';
import { Readable } from 'stream';

import { VERSION } from './version';
import { Fetch, getDefaultAgent, getFetch } from './fetch-polyfill';

export abstract class APIClient {
  baseURL: string;
  maxRetries: number;
  timeout: number;
  httpAgent: Agent | undefined;

  private fetch: Fetch;
  protected idempotencyHeader?: string;

  constructor({
    baseURL,
    maxRetries = 2,
    timeout = 60 * 1000, // 60s
    httpAgent,
  }: {
    baseURL: string;
    maxRetries?: number;
    timeout: number | undefined;
    httpAgent: Agent | undefined;
  }) {
    this.baseURL = baseURL;
    this.maxRetries = validatePositiveInteger('maxRetries', maxRetries);
    this.timeout = validatePositiveInteger('timeout', timeout);
    this.httpAgent = httpAgent;

    this.fetch = getFetch();
  }

  protected authHeaders(): Headers {
    return {};
  }

  /**
   * Override this to add your own default headers, for example:
   *
   *  {
   *    ...super.defaultHeaders(),
   *    Authorization: 'Bearer 123',
   *  }
   */
  protected defaultHeaders(): Headers {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': this.getUserAgent(),
      ...getPlatformHeaders(),
      ...this.authHeaders(),
    };
  }

  /**
   * Override this to add your own headers validation:
   */
  protected validateHeaders(headers: Headers, customHeaders: Headers) {}

  /**
   * Override this to add your own qs.stringify options, for example:
   *
   *  {
   *    ...super.qsOptions(),
   *    strictNullHandling: true,
   *  }
   */
  protected qsOptions(): qs.IStringifyOptions | undefined {
    return {};
  }

  protected defaultIdempotencyKey(): string {
    return `stainless-node-retry-${uuid4()}`;
  }

  get<Req extends {}, Rsp>(path: string, opts?: RequestOptions<Req>): Promise<Rsp> {
    return this.request({ method: 'get', path, ...opts });
  }
  post<Req extends {}, Rsp>(path: string, opts?: RequestOptions<Req>): Promise<Rsp> {
    return this.request({ method: 'post', path, ...opts });
  }
  patch<Req extends {}, Rsp>(path: string, opts?: RequestOptions<Req>): Promise<Rsp> {
    return this.request({ method: 'patch', path, ...opts });
  }
  put<Req extends {}, Rsp>(path: string, opts?: RequestOptions<Req>): Promise<Rsp> {
    return this.request({ method: 'put', path, ...opts });
  }
  delete<Req extends {}, Rsp>(path: string, opts?: RequestOptions<Req>): Promise<Rsp> {
    return this.request({ method: 'delete', path, ...opts });
  }

  getAPIList<Item, PageClass extends AbstractPage<Item> = AbstractPage<Item>>(
    path: string,
    Page: new (...args: any[]) => PageClass,
    opts?: RequestOptions<any>,
  ): PagePromise<PageClass> {
    return this.requestAPIList(Page, { method: 'get', path, ...opts });
  }

  buildRequest<Req extends {}>(
    options: FinalRequestOptions<Req>,
  ): { req: RequestInit; url: string; timeout: number } {
    const { method, path, query, headers: headers = {} } = options;
    const body =
      options.body instanceof Readable ? options.body
      : options.body ? JSON.stringify(options.body, null, 2)
      : null;
    const contentLength = typeof body === 'string' ? body.length.toString() : null;

    const url = this.buildURL(path!, query);
    const httpAgent = options.httpAgent ?? this.httpAgent ?? getDefaultAgent(url);
    const timeout = options.timeout ?? this.timeout;
    validatePositiveInteger('timeout', timeout);

    if (this.idempotencyHeader && method !== 'get') {
      if (!options.idempotencyKey) options.idempotencyKey = this.defaultIdempotencyKey();
      headers[this.idempotencyHeader] = options.idempotencyKey;
    }

    const reqHeaders: Record<string, string> = {
      ...(contentLength && { 'Content-Length': contentLength }),
      ...this.defaultHeaders(),
      ...headers,
    };

    // Strip any headers being explicitly omitted with null
    Object.keys(reqHeaders).forEach((key) => reqHeaders[key] === null && delete reqHeaders[key]);

    const req: RequestInit = {
      method,
      ...(body && { body }),
      headers: reqHeaders,
      ...(httpAgent && { agent: httpAgent }),
    };

    this.validateHeaders(reqHeaders, headers);
    return { req, url, timeout };
  }

  async request<Req extends {}, Rsp>(
    options: FinalRequestOptions<Req>,
    retriesRemaining = options.maxRetries ?? this.maxRetries,
  ): Promise<APIResponse<Rsp>> {
    const { req, url, timeout } = this.buildRequest(options);

    this.debug('request', url, options, req.headers);

    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);

    if (response instanceof Error) {
      if (retriesRemaining) return this.retryRequest(options, retriesRemaining);
      if (response.name === 'AbortError') throw new APIConnectionTimeoutError();
      throw new APIConnectionError({ cause: response });
    }

    const responseHeaders = createResponseHeaders(response.headers);

    if (!response.ok) {
      if (retriesRemaining && this.shouldRetry(response)) {
        return this.retryRequest(options, retriesRemaining, responseHeaders);
      }

      const errText = await response.text().catch(() => 'Unknown');
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? undefined : errText;

      this.debug('response', response.status, url, responseHeaders, errMessage);

      const err = APIError.generate(response.status, errJSON, errMessage, responseHeaders);

      throw err;
    }

    if (options.stream) {
      // Note: there is an invariant here that isn't represented in the type system
      // that if you set `stream: true` the response type must also be `Stream<T>`
      return new Stream<Rsp>(response, controller) as any;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const json = await response.json();

      if (typeof json === 'object' && json != null) {
        /** @deprecated – we expect to change this interface in the near future. */
        Object.defineProperty(json, 'responseHeaders', {
          enumerable: false,
          writable: false,
          value: responseHeaders,
        });
      }

      this.debug('response', response.status, url, responseHeaders, json);

      return json as APIResponse<Rsp>;
    }

    // TODO handle blob, arraybuffer, other content types, etc.
    const text = response.text();
    this.debug('response', response.status, url, responseHeaders, text);
    return text as Promise<any>;
  }

  requestAPIList<Item = unknown, PageClass extends AbstractPage<Item> = AbstractPage<Item>>(
    Page: new (...args: ConstructorParameters<typeof AbstractPage>) => PageClass,
    options: FinalRequestOptions,
  ): PagePromise<PageClass> {
    const requestPromise = this.request(options) as Promise<APIResponse<unknown>>;
    return new PagePromise(this, requestPromise, options, Page);
  }

  buildURL<Req>(path: string, query: Req | undefined): string {
    const url = isAbsoluteURL(path) ? new URL(path) : new URL(this.baseURL + path);

    if (query) {
      url.search = qs.stringify(query, this.qsOptions());
    }

    return url.toString();
  }

  async fetchWithTimeout(
    url: RequestInfo,
    { signal, ...options }: RequestInit = {},
    ms: number,
    controller: AbortController,
  ) {
    if (signal) signal.addEventListener('abort', controller.abort);

    const timeout = setTimeout(() => controller.abort(), ms);

    return this.getRequestClient()
      .fetch(url, { signal: controller.signal as any, ...options })
      .finally(() => {
        clearTimeout(timeout);
      });
  }

  protected getRequestClient(): RequestClient {
    return { fetch: this.fetch };
  }

  private shouldRetry(response: Response): boolean {
    // Note this is not a standard header.
    const shouldRetryHeader = response.headers.get('x-should-retry');

    // If the server explicitly says whether or not to retry, obey.
    if (shouldRetryHeader === 'true') return true;
    if (shouldRetryHeader === 'false') return false;

    // Retry on lock timeouts.
    if (response.status === 409) return true;

    // Retry on rate limits.
    if (response.status === 429) return true;

    // Retry internal errors.
    if (response.status >= 500) return true;

    return false;
  }

  private async retryRequest<Req extends {}, Rsp>(
    options: FinalRequestOptions<Req>,
    retriesRemaining: number,
    responseHeaders?: Headers | undefined,
  ): Promise<Rsp> {
    retriesRemaining -= 1;

    // About the Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
    //
    // TODO: we may want to handle the case where the header is using the http-date syntax: "Retry-After: <http-date>".
    // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After#syntax for details.
    const retryAfter = parseInt(responseHeaders?.['retry-after'] || '');

    const maxRetries = options.maxRetries ?? this.maxRetries;
    const timeout = this.calculateRetryTimeoutSeconds(retriesRemaining, retryAfter, maxRetries) * 1000;
    await sleep(timeout);

    return this.request(options, retriesRemaining);
  }

  private calculateRetryTimeoutSeconds(
    retriesRemaining: number,
    retryAfter: number,
    maxRetries: number,
  ): number {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 2;

    // If the API asks us to wait a certain amount of time (and it's a reasonable amount),
    // just do what it says.
    if (Number.isInteger(retryAfter) && retryAfter <= 60) {
      return retryAfter;
    }

    const numRetries = maxRetries - retriesRemaining;

    // Apply exponential backoff, but not more than the max.
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(numRetries - 1, 2), maxRetryDelay);

    // Apply some jitter, plus-or-minus half a second.
    const jitter = Math.random() - 0.5;

    return sleepSeconds + jitter;
  }

  private getUserAgent(): string {
    return `${this.constructor.name}/JS ${VERSION}`;
  }

  private debug(action: string, ...args: any[]) {
    if (process.env['DEBUG'] === 'true') {
      console.log(`${this.constructor.name}:DEBUG:${action}`, ...args);
    }
  }
}

export class APIResource {
  protected client: APIClient;
  constructor(client: APIClient) {
    this.client = client;

    this.get = client.get.bind(client);
    this.post = client.post.bind(client);
    this.patch = client.patch.bind(client);
    this.put = client.put.bind(client);
    this.delete = client.delete.bind(client);
    this.getAPIList = client.getAPIList.bind(client);
  }

  protected get: APIClient['get'];
  protected post: APIClient['post'];
  protected patch: APIClient['patch'];
  protected put: APIClient['put'];
  protected delete: APIClient['delete'];
  protected getAPIList: APIClient['getAPIList'];
}

export type PageInfo = { url: URL } | { params: Record<string, unknown> | null };

export abstract class AbstractPage<Item> implements AsyncIterable<Item> {
  #client: APIClient;
  protected options: FinalRequestOptions;

  constructor(client: APIClient, response: APIResponse<unknown>, options: FinalRequestOptions) {
    this.#client = client;
    this.options = options;
  }

  /**
   * @deprecated Use nextPageInfo instead
   */
  abstract nextPageParams(): Partial<Record<string, unknown>> | null;
  abstract nextPageInfo(): PageInfo | null;

  abstract getPaginatedItems(): Item[];

  hasNextPage(): boolean {
    const items = this.getPaginatedItems();
    if (!items.length) return false;
    return this.nextPageInfo() != null;
  }

  async getNextPage(): Promise<AbstractPage<Item>> {
    const nextInfo = this.nextPageInfo();
    if (!nextInfo) {
      throw new Error(
        'No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.',
      );
    }
    const nextOptions = { ...this.options };
    if ('params' in nextInfo) {
      nextOptions.query = { ...nextOptions.query, ...nextInfo.params };
    } else if ('url' in nextInfo) {
      const params = [...Object.entries(nextOptions.query || {}), ...nextInfo.url.searchParams.entries()];
      for (const [key, value] of params) {
        nextInfo.url.searchParams.set(key, value);
      }
      nextOptions.query = undefined;
      nextOptions.path = nextInfo.url.toString();
    }
    return await this.#client.requestAPIList(this.constructor as any, nextOptions);
  }

  async *iterPages() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let page: AbstractPage<Item> = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }

  async *[Symbol.asyncIterator]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
}

export class PagePromise<
    PageClass extends AbstractPage<Item>,
    Item = ReturnType<PageClass['getPaginatedItems']>[number],
  >
  extends Promise<PageClass>
  implements AsyncIterable<Item>
{
  /**
   * This subclass of Promise will resolve to an instantiated Page once the request completes.
   */
  constructor(
    client: APIClient,
    requestPromise: Promise<APIResponse<unknown>>,
    options: FinalRequestOptions,
    Page: new (...args: ConstructorParameters<typeof AbstractPage>) => PageClass,
  ) {
    super((resolve, reject) =>
      requestPromise.then((response) => resolve(new Page(client, response, options))).catch(reject),
    );
  }

  /**
   * Enable subclassing Promise.
   * Ref: https://stackoverflow.com/a/60328122
   */
  static get [Symbol.species]() {
    return Promise;
  }

  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
}

export class Stream<Item> implements AsyncIterable<Item>, APIResponse<Stream<Item>> {
  response: Response;
  responseHeaders: Headers;
  controller: AbortController;

  constructor(response: Response, controller: AbortController) {
    this.response = response;
    this.controller = controller;
    this.responseHeaders = createResponseHeaders(response.headers);
  }

  async *[Symbol.asyncIterator](): AsyncIterator<Item, any, undefined> {
    if (!this.response.body) {
      this.controller.abort();
      throw new Error(`Attempted to iterate over a response with no body`);
    }

    for await (const chunk of this.response.body) {
      let text;
      if (chunk instanceof Buffer) {
        text = chunk.toString();
      } else {
        text = chunk;
      }

      if (text.startsWith('data: ')) {
        text = text.substring(6);
      }

      if (text.startsWith('[DONE]')) {
        break;
      }

      yield JSON.parse(text);
    }

    this.controller.abort();
  }
}

export const createResponseHeaders = (
  headers: Awaited<ReturnType<Fetch>>['headers'],
): Record<string, string> => {
  return new Proxy(Object.fromEntries(headers.entries()), {
    get(target, name) {
      const key = name.toString();
      return target[key.toLowerCase()] || target[key];
    },
  });
};

type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type RequestClient = { fetch: Fetch };
export type Headers = Record<string, string | null | undefined>;
export type KeysEnum<T> = { [P in keyof Required<T>]: true };

export type RequestOptions<Req extends {} = Record<string, unknown> | Readable> = {
  method?: HTTPMethod;
  path?: string;
  query?: Req | undefined;
  body?: Req | undefined;
  headers?: Headers | undefined;

  maxRetries?: number;
  stream?: boolean | undefined;
  timeout?: number;
  httpAgent?: Agent;
  idempotencyKey?: string;
};

// This is required so that we can determine if a given object matches the RequestOptions
// type at runtime. While this requires duplication, it is enforced by the TypeScript
// compiler such that any missing / extraneous keys will cause an error.
const requestOptionsKeys: KeysEnum<RequestOptions> = {
  method: true,
  path: true,
  query: true,
  body: true,
  headers: true,

  maxRetries: true,
  stream: true,
  timeout: true,
  httpAgent: true,
  idempotencyKey: true,
};

export const isRequestOptions = (obj: unknown): obj is RequestOptions => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    !isEmptyObj(obj) &&
    Object.keys(obj).every((k) => hasOwn(requestOptionsKeys, k))
  );
};

export type FinalRequestOptions<Req extends {} = Record<string, unknown> | Readable> = RequestOptions<Req> & {
  method: HTTPMethod;
  path: string;
};

export type APIResponse<T> = T & {
  responseHeaders: Headers;
};

export class APIError extends Error {
  readonly status: number | undefined;
  readonly headers: Headers | undefined;
  readonly error: Object | undefined;

  constructor(
    status: number | undefined,
    error: Object | undefined,
    message: string | undefined,
    headers: Headers | undefined,
  ) {
    super(message || (error as any)?.message);
    this.status = status;
    this.headers = headers;
    this.error = error;
  }

  static generate(
    status: number | undefined,
    error: Object | undefined,
    message: string | undefined,
    headers: Headers | undefined,
  ) {
    if (!status) return new APIConnectionError({ cause: castToError(error) });

    if (status === 400) return new BadRequestError(status, error, message, headers);
    if (status === 401) return new AuthenticationError(status, error, message, headers);
    if (status === 403) return new PermissionDeniedError(status, error, message, headers);
    if (status === 404) return new NotFoundError(status, error, message, headers);
    if (status === 409) return new ConflictError(status, error, message, headers);
    if (status === 422) return new UnprocessableEntityError(status, error, message, headers);
    if (status === 429) return new RateLimitError(status, error, message, headers);
    if (status >= 500) return new InternalServerError(status, error, message, headers);

    return new APIError(status, error, message, headers);
  }
}

export class BadRequestError extends APIError {
  override readonly status: 400 = 400;
}
export class AuthenticationError extends APIError {
  override readonly status: 401 = 401;
}
export class PermissionDeniedError extends APIError {
  override readonly status: 403 = 403;
}
export class NotFoundError extends APIError {
  override readonly status: 404 = 404;
}
export class ConflictError extends APIError {
  override readonly status: 409 = 409;
}
export class UnprocessableEntityError extends APIError {
  override readonly status: 422 = 422;
}
export class RateLimitError extends APIError {
  override readonly status: 429 = 429;
}
export class InternalServerError extends APIError {}

export class APIConnectionError extends APIError {
  override readonly status: undefined = undefined;

  constructor({ message, cause }: { message?: string; cause?: Error | undefined }) {
    super(undefined, undefined, message || 'Connection error.', undefined);
    // eslint-disable-next-line
    // @ts-ignore
    if (cause) this.cause = cause;
  }
}

export class APIConnectionTimeoutError extends APIConnectionError {
  constructor() {
    super({ message: 'Request timed out.' });
  }
}

declare const Deno: any;
type Arch = 'x32' | 'x64' | 'arm' | 'arm64' | `other:${string}` | 'unknown';
type PlatformName =
  | 'MacOS'
  | 'Linux'
  | 'Windows'
  | 'FreeBSD'
  | 'OpenBSD'
  | 'iOS'
  | 'Android'
  | `Other:${string}`
  | 'Unknown';
type PlatformProperties = {
  'X-Stainless-Lang': 'js';
  'X-Stainless-Package-Version': string;
  'X-Stainless-OS': PlatformName;
  'X-Stainless-Arch': Arch;
  'X-Stainless-Runtime': 'node' | 'deno' | 'unknown';
  'X-Stainless-Runtime-Version': string;
};
const getPlatformProperties = (): PlatformProperties => {
  if (typeof Deno !== 'undefined' && Deno.build != null) {
    return {
      'X-Stainless-Lang': 'js',
      'X-Stainless-Package-Version': VERSION,
      'X-Stainless-OS': normalizePlatform(Deno.build.os),
      'X-Stainless-Arch': normalizeArch(Deno.build.arch),
      'X-Stainless-Runtime': 'deno',
      'X-Stainless-Runtime-Version': Deno.version,
    };
  }
  if (typeof process !== 'undefined') {
    return {
      'X-Stainless-Lang': 'js',
      'X-Stainless-Package-Version': VERSION,
      'X-Stainless-OS': normalizePlatform(process.platform),
      'X-Stainless-Arch': normalizeArch(process.arch),
      'X-Stainless-Runtime': 'node',
      'X-Stainless-Runtime-Version': process.version,
    };
  }
  // TODO add support for Cloudflare workers, browsers, etc.
  return {
    'X-Stainless-Lang': 'js',
    'X-Stainless-Package-Version': VERSION,
    'X-Stainless-OS': 'Unknown',
    'X-Stainless-Arch': 'unknown',
    'X-Stainless-Runtime': 'unknown',
    'X-Stainless-Runtime-Version': 'unknown',
  };
};

const normalizeArch = (arch: string): Arch => {
  // Node docs:
  // - https://nodejs.org/api/process.html#processarch
  // Deno docs:
  // - https://doc.deno.land/deno/stable/~/Deno.build
  if (arch === 'x32') return 'x32';
  if (arch === 'x86_64' || arch === 'x64') return 'x64';
  if (arch === 'arm') return 'arm';
  if (arch === 'aarch64' || arch === 'arm64') return 'arm64';
  if (arch) return `other:${arch}`;
  return 'unknown';
};

const normalizePlatform = (platform: string): PlatformName => {
  // Node platforms:
  // - https://nodejs.org/api/process.html#processplatform
  // Deno platforms:
  // - https://doc.deno.land/deno/stable/~/Deno.build
  // - https://github.com/denoland/deno/issues/14799

  platform = platform.toLowerCase();

  // NOTE: this iOS check is untested and may not work
  // Node does not work natively on IOS, there is a fork at
  // https://github.com/nodejs-mobile/nodejs-mobile
  // however it is unknown at the time of writing how to detect if it is running
  if (platform.includes('ios')) return 'iOS';
  if (platform === 'android') return 'Android';
  if (platform === 'darwin') return 'MacOS';
  if (platform === 'win32') return 'Windows';
  if (platform === 'freebsd') return 'FreeBSD';
  if (platform === 'openbsd') return 'OpenBSD';
  if (platform === 'linux') return 'Linux';
  if (platform) return `Other:${platform}`;
  return 'Unknown';
};

let _platformHeaders: PlatformProperties;
const getPlatformHeaders = () => {
  return (_platformHeaders ??= getPlatformProperties());
};

const safeJSON = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return undefined;
  }
};

// https://stackoverflow.com/a/19709846
const startsWithSchemeRegexp = new RegExp('^(?:[a-z]+:)?//', 'i');
const isAbsoluteURL = (url: string): boolean => {
  return startsWithSchemeRegexp.test(url);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const validatePositiveInteger = (name: string, n: number) => {
  if (!Number.isInteger(n)) {
    throw new Error(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return n;
};

const castToError = (err: any): Error => {
  if (err instanceof Error) return err;
  return new Error(err);
};

/**
 * Returns a multipart/form-data request if any part of the given request body contains a File / Blob value.
 * Otherwise returns the request as is.
 */
export const maybeMultipartFormRequestOptions = <T extends {} = Record<string, unknown>>(
  opts: RequestOptions<T>,
): RequestOptions<T | Readable> => {
  // TODO: does this add unreasonable overhead in the case where we shouldn't use multipart/form-data?
  const form = createForm(opts.body);

  for (const [_, entry] of form.entries()) {
    const value = entry.valueOf();
    if (value instanceof File || value instanceof Blob) {
      return getMultipartRequestOptions(form, opts);
    }
  }

  return opts;
};

export const multipartFormRequestOptions = <T extends {} = Record<string, unknown>>(
  opts: RequestOptions<T>,
): RequestOptions<T | Readable> => {
  return getMultipartRequestOptions(createForm(opts.body), opts);
};

const createForm = <T = Record<string, unknown>>(body: T | undefined): FormData => {
  const form = new FormData();
  Object.entries(body || {}).forEach(([key, value]) => addFormValue(form, key, value));
  return form;
};

const getMultipartRequestOptions = <T extends {} = Record<string, unknown>>(
  form: FormData,
  opts: RequestOptions<T>,
): RequestOptions<T | Readable> => {
  const encoder = new FormDataEncoder(form);
  return {
    ...opts,
    headers: { ...opts.headers, ...encoder.headers, 'Content-Length': encoder.contentLength },
    body: Readable.from(encoder),
  };
};

const addFormValue = (form: FormData, key: string, value: unknown) => {
  if (value == null) {
    throw new TypeError(
      `null is not a valid form data value, if you want to pass null then you need to use the string 'null'`,
    );
  }

  // TODO: make nested formats configurable
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof File ||
    value instanceof Blob
  ) {
    form.append(key, value);
  } else if (Array.isArray(value)) {
    value.forEach((entry) => {
      addFormValue(form, key + '[]', entry);
    });
  } else if (typeof value === 'object') {
    Object.entries(value).forEach(([name, prop]) => {
      addFormValue(form, `${key}[${name}]`, prop);
    });
  } else {
    throw new TypeError(
      `Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`,
    );
  }
};

export const ensurePresent = <T>(value: T | null | undefined): T => {
  if (value == null) throw new Error(`Expected a value to be given but received ${value} instead.`);
  return value;
};

export const coerceInteger = (value: unknown): number => {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') return parseInt(value, 10);

  throw new Error(`Could not coerce ${value} (type: ${typeof value}) into a number`);
};

export const coerceFloat = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);

  throw new Error(`Could not coerce ${value} (type: ${typeof value}) into a number`);
};

export const coerceBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return Boolean(value);
};

// https://stackoverflow.com/a/34491287
export function isEmptyObj(obj: Object | null | undefined): boolean {
  if (!obj) return true;
  for (const _k in obj) return false;
  return true;
}

// https://eslint.org/docs/latest/rules/no-prototype-builtins
export function hasOwn(obj: Object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * https://stackoverflow.com/a/2117523
 */
const uuid4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface HeadersProtocol {
  get: (header: string) => string | null | undefined;
}
export type HeadersLike = Record<string, string | string[] | undefined> | HeadersProtocol;

export const isHeadersProtocol = (headers: any): headers is HeadersProtocol => {
  return typeof headers?.get === 'function';
};

export const getHeader = (headers: HeadersLike, key: string): string | null | undefined => {
  const lowerKey = key.toLowerCase();
  if (isHeadersProtocol(headers)) return headers.get(key) || headers.get(lowerKey);
  const value = headers[key] || headers[lowerKey];
  if (Array.isArray(value)) {
    if (value.length <= 1) return value[0];
    console.warn(`Received ${value.length} entries for the ${key} header, using the first entry.`);
    return value[0];
  }
  return value;
};
