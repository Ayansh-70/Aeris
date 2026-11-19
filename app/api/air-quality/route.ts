import { getAir } from "../../../lib/server/environment";
import { checkBudget, errorResponse, PublicError } from "../../../lib/server/http";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const mode = params.get("mode") ?? "live";
    const lat = params.get("latitude")?.trim(), lon = params.get("longitude")?.trim();
    if (!lat || !lon || (mode !== "live" && mode !== "demo")) throw new PublicError(400, "Provide latitude, longitude, and a valid data mode.");
    checkBudget("air", 240);
    return Response.json(await getAir(Number(lat), Number(lon), mode), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

