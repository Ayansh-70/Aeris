import { buildContext, contextSchema } from "../../../lib/server/context";
import {
  checkBudget,
  errorResponse,
  PublicError,
  readRequest,
} from "../../../lib/server/http";

export async function POST(request: Request) {
  try {
    const input = contextSchema.safeParse(await readRequest(request));
    if (!input.success)
      throw new PublicError(400, "Invalid household profile or data mode.");
    checkBudget("recommendations", 90);
    const context = await buildContext(input.data);
    return Response.json({
      actions: context.actions,
      conditions: context.conditions,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
