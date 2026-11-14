import * as messages from "./messages";

// ============================================================
// Alexa リクエスト / レスポンスの型（使う部分のみ）
// ============================================================

export interface AlexaRequestEnvelope {
  session?: { application?: { applicationId?: string } };
  context?: { System?: { application?: { applicationId?: string } } };
  request: {
    type: string;
    timestamp?: string;
    intent?: {
      name: string;
      slots?: Record<string, { value?: string | null } | undefined>;
    };
  };
}

export interface AlexaResponse {
  version: "1.0";
  response: {
    outputSpeech?: { type: "PlainText"; text: string };
    shouldEndSession?: boolean;
  };
}

export interface HandlerResult {
  outputSpeech: string;
  shouldEndSession: boolean;
}

/** 発話からアイテムを追加し、追加できたアイテム名を返す（テスト時に差し替えられるよう注入する） */
export type AddItems = (utterance: string) => Promise<string>;

type IntentHandler = (
  event: AlexaRequestEnvelope,
  addItems: AddItems,
) => Promise<HandlerResult> | HandlerResult;

export function buildResponse(outputSpeech: string, shouldEndSession: boolean): AlexaResponse {
  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text: outputSpeech,
      },
      shouldEndSession,
    },
  };
}

// ============================================================
// Intent handlers
// ============================================================

export async function handleAddItem(
  event: AlexaRequestEnvelope,
  addItems: AddItems,
): Promise<HandlerResult> {
  const userUtterance = event.request.intent?.slots?.Query?.value;

  if (!userUtterance) {
    return { outputSpeech: messages.ADD_ITEM_NOT_HEARD, shouldEndSession: false };
  }

  const addedItems = await addItems(userUtterance);

  return { outputSpeech: messages.addItemSuccess(addedItems), shouldEndSession: false };
}

export const handleHelp: IntentHandler = () => ({
  outputSpeech: messages.HELP,
  shouldEndSession: false,
});

export const handleStop: IntentHandler = () => ({
  outputSpeech: messages.STOP,
  shouldEndSession: true,
});

export const handleNavigateHome: IntentHandler = () => ({
  outputSpeech: messages.NAVIGATE_HOME,
  shouldEndSession: true,
});

const INTENTS: Record<string, IntentHandler> = {
  AddItemIntent: handleAddItem,
  "AMAZON.HelpIntent": handleHelp,
  "AMAZON.CancelIntent": handleStop,
  "AMAZON.StopIntent": handleStop,
  "AMAZON.NavigateHomeIntent": handleNavigateHome,
};

// ============================================================
// Entry (Python版の lambda_handler 相当)
// ============================================================

export async function handleAlexaRequest(
  event: AlexaRequestEnvelope,
  addItems: AddItems,
): Promise<AlexaResponse | null> {
  console.log(JSON.stringify(event));

  const request = event.request;

  // 1. LaunchRequest
  if (request.type === "LaunchRequest") {
    return buildResponse(messages.LAUNCH, false);
  }

  // 2. IntentRequest
  if (request.type === "IntentRequest") {
    const handler = request.intent && INTENTS[request.intent.name];

    if (!handler) {
      return buildResponse(messages.UNKNOWN_INTENT, true);
    }

    try {
      const result = await handler(event, addItems);
      return buildResponse(result.outputSpeech, result.shouldEndSession);
    } catch (e) {
      console.error("Intent handling failed", e);
      return buildResponse(messages.ERROR, true);
    }
  }

  // 3. SessionEndedRequest
  if (request.type === "SessionEndedRequest") {
    console.log("Session ended");
    return null;
  }

  // 4. Other
  return buildResponse(messages.UNKNOWN_REQUEST, false);
}
