import type { Env } from "./env";
import { handleAlexaRequest, type AlexaRequestEnvelope } from "./handler";
import { addItems } from "./service";
import { VerificationError, verifyAlexaRequest } from "./verify/alexaSignature";

function getApplicationId(event: AlexaRequestEnvelope): string | undefined {
  return (
    event.session?.application?.applicationId ??
    event.context?.System?.application?.applicationId
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await request.text();
    let event: AlexaRequestEnvelope;
    try {
      event = JSON.parse(body) as AlexaRequestEnvelope;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    try {
      await verifyAlexaRequest(request.headers, body, event.request?.timestamp);
    } catch (e) {
      if (e instanceof VerificationError) {
        console.warn("Alexa request verification failed:", e.message);
        return new Response("Bad Request", { status: 400 });
      }
      throw e;
    }

    if (env.ALEXA_SKILL_ID && getApplicationId(event) !== env.ALEXA_SKILL_ID) {
      console.warn("Unexpected applicationId:", getApplicationId(event));
      return new Response("Forbidden", { status: 403 });
    }

    const response = await handleAlexaRequest(event, (utterance) => addItems(utterance, env));

    // SessionEndedRequest には応答本文が不要だが、HTTPS エンドポイントは 200 を返す必要がある
    return Response.json(response ?? { version: "1.0", response: {} });
  },
} satisfies ExportedHandler<Env>;
