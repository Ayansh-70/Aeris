import { answerChat, chatSchema } from "../../../lib/server/assistant";
import { buildContext } from "../../../lib/server/context";
import { checkBudget, errorResponse, PublicError, readRequest } from "../../../lib/server/http";

export async function POST(request: Request) {
  try {
    const input = chatSchema.safeParse(await readRequest(request));
    if (!input.success) throw new PublicError(400, "Check your profile and send a message of 1–800 characters with at most six preceding turns.");
    checkBudget("chat", 20);
    return Response.json(await answerChat(input.data, await buildContext(input.data)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) { return errorResponse(error); }
}

