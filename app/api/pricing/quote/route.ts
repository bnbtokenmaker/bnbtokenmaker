import type { QuoteErrorResponse, QuoteResponse } from "../../../../lib/pricing/server/types";
import {
  parseQuoteRequest,
  quotePlatformFee,
  toQuoteDto,
} from "../../../../lib/pricing/server/quote";
import { currentPricingSource } from "../../../../lib/pricing/server/current-pricing-source";

/** The platform fee endpoint is server-side by design; Node runtime is the default. */
export const dynamic = "force-dynamic";

function errorResponse(code: string, message: string, status = 400): Response {
  const body: QuoteErrorResponse = { error: { code, message } };
  return Response.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid-json", "request body must be valid JSON");
  }

  const parsed = parseQuoteRequest(body);
  if (!parsed.ok) {
    return errorResponse(parsed.code, parsed.message);
  }

  try {
    const result = quotePlatformFee(currentPricingSource, parsed.selection, new Date());
    const quote: QuoteResponse = toQuoteDto(result);
    return Response.json({ quote }, { status: 201 });
  } catch {
    return errorResponse("internal-error", "unable to compute quote right now", 500);
  }
}