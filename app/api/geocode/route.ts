import { geocode } from "../../../lib/server/environment";
import {
  checkBudget,
  errorResponse,
  PublicError,
} from "../../../lib/server/http";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim();
    if (!query || query.length < 2 || query.length > 100)
      throw new PublicError(
        400,
        "Enter a city name between 2 and 100 characters.",
      );
    checkBudget("geocoding", 150);
    return Response.json({ locations: await geocode(query) });
  } catch (error) {
    return errorResponse(error);
  }
}
