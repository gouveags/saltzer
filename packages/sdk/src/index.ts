import {
  type ContextPacket,
  ContextPacketSchema,
  type CreateOutcomeInput,
  type LocalDate,
  type Outcome,
  type OutcomeDecisionInput,
  OutcomeSchema,
  type TodayView,
  TodayViewSchema,
  type UpdateOutcomeInput,
} from "@saltzer/domain";

export class SaltzerApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "SaltzerApiError";
  }
}

export interface SaltzerClientOptions {
  baseUrl: string;
  token?: string;
  fetch?: typeof globalThis.fetch;
}

export class SaltzerClient {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly requestFetch: typeof globalThis.fetch;

  constructor(options: SaltzerClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    // Browser fetch is a Web IDL method and must retain its global receiver.
    // Keeping the binding here also makes every consumer (web, CLI, and MCP)
    // share the same safe request path.
    this.requestFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async today(localDate: LocalDate): Promise<TodayView> {
    const data = await this.request(`/v1/today?date=${encodeURIComponent(localDate)}`);
    return TodayViewSchema.parse(data);
  }

  async addOutcome(localDate: LocalDate, input: CreateOutcomeInput): Promise<Outcome> {
    const data = await this.request(`/v1/contracts/${localDate}/outcomes`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return OutcomeSchema.parse(data);
  }

  async updateOutcome(outcomeId: string, input: UpdateOutcomeInput): Promise<Outcome> {
    const data = await this.request(`/v1/outcomes/${outcomeId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return OutcomeSchema.parse(data);
  }

  async decideOutcome(
    outcomeId: string,
    localDate: LocalDate,
    input: OutcomeDecisionInput,
  ): Promise<Outcome> {
    const data = await this.request(
      `/v1/outcomes/${outcomeId}/decision?date=${encodeURIComponent(localDate)}`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
    return OutcomeSchema.parse(data);
  }

  async addScheduledToDay(outcomeId: string, localDate: LocalDate): Promise<Outcome> {
    const data = await this.request(`/v1/outcomes/${outcomeId}/add-to-day`, {
      method: "POST",
      body: JSON.stringify({ localDate }),
    });
    return OutcomeSchema.parse(data);
  }

  async contextPacket(outcomeId: string, localDate: LocalDate): Promise<ContextPacket> {
    const data = await this.request(
      `/v1/outcomes/${outcomeId}/context-packet?date=${encodeURIComponent(localDate)}`,
    );
    return ContextPacketSchema.parse(data);
  }

  async createToken(
    name: string,
  ): Promise<{ id: string; name: string; scopes: string[]; token: string }> {
    const data = await this.request("/v1/tokens", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    const value = data as { id?: unknown; name?: unknown; scopes?: unknown; token?: unknown };
    if (
      typeof value.id !== "string" ||
      typeof value.name !== "string" ||
      !Array.isArray(value.scopes) ||
      typeof value.token !== "string"
    ) {
      throw new SaltzerApiError(
        "Saltzer returned an invalid token response.",
        500,
        "INVALID_RESPONSE",
      );
    }
    return { id: value.id, name: value.name, scopes: value.scopes as string[], token: value.token };
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);

    const response = await this.requestFetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });

    const data = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;

    if (!response.ok) {
      throw new SaltzerApiError(
        data?.error?.message ?? `Saltzer request failed with status ${response.status}.`,
        response.status,
        data?.error?.code,
      );
    }

    return data;
  }
}
