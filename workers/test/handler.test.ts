import { describe, expect, it, vi } from "vitest";

import {
  buildResponse,
  handleAddItem,
  handleAlexaRequest,
  type AlexaRequestEnvelope,
} from "../src/handler";
import * as messages from "../src/messages";

const echoAddItems = vi.fn(async (utterance: string) => utterance);

function intentEvent(name: string, value?: string | null): AlexaRequestEnvelope {
  return {
    request: {
      type: "IntentRequest",
      intent: { name, slots: { Query: { value } } },
    },
  };
}

// ============================================================
// Request Type
// ============================================================

describe("request type", () => {
  it("LaunchRequest", async () => {
    const res = await handleAlexaRequest({ request: { type: "LaunchRequest" } }, echoAddItems);
    expect(res).toEqual(buildResponse(messages.LAUNCH, false));
  });

  it("IntentRequest", async () => {
    const res = await handleAlexaRequest(intentEvent("AddItemIntent", "牛乳"), echoAddItems);
    expect(res).not.toBeNull();
  });

  it("SessionEndedRequest", async () => {
    const res = await handleAlexaRequest({ request: { type: "SessionEndedRequest" } }, echoAddItems);
    expect(res).toBeNull();
  });

  it("UnknownRequest", async () => {
    const res = await handleAlexaRequest({ request: { type: "UnknownRequest" } }, echoAddItems);
    expect(res).toEqual(buildResponse(messages.UNKNOWN_REQUEST, false));
  });
});

// ============================================================
// Intent Name
// ============================================================

describe("intent name", () => {
  it.each([
    ["AddItemIntent", messages.addItemSuccess("牛乳"), false],
    ["AMAZON.HelpIntent", messages.HELP, false],
    ["AMAZON.CancelIntent", messages.STOP, true],
    ["AMAZON.StopIntent", messages.STOP, true],
    ["AMAZON.NavigateHomeIntent", messages.NAVIGATE_HOME, true],
  ])("%s", async (intentName, outputSpeech, shouldEndSession) => {
    const res = await handleAlexaRequest(intentEvent(intentName, "牛乳"), echoAddItems);
    expect(res).toEqual(buildResponse(outputSpeech, shouldEndSession));
  });

  it("unknown intent", async () => {
    const res = await handleAlexaRequest(intentEvent("UnknownIntent", "牛乳"), echoAddItems);
    expect(res).toEqual(buildResponse(messages.UNKNOWN_INTENT, true));
  });

  it("returns ERROR when addItems throws", async () => {
    const failingAddItems = vi.fn(async () => {
      throw new Error("boom");
    });
    const res = await handleAlexaRequest(intentEvent("AddItemIntent", "牛乳"), failingAddItems);
    expect(res).toEqual(buildResponse(messages.ERROR, true));
  });
});

// ============================================================
// handleAddItem
// ============================================================

describe("handleAddItem", () => {
  it.each(["牛乳", "たまご", "鶏むね肉", "ドライバー", "単4電池"])("%s", async (utterance) => {
    const result = await handleAddItem(intentEvent("AddItemIntent", utterance), echoAddItems);
    expect(result).toEqual({
      outputSpeech: messages.addItemSuccess(utterance),
      shouldEndSession: false,
    });
  });

  it.each([null, ""])("without utterance (%j)", async (utterance) => {
    const addItems = vi.fn(echoAddItems);
    const result = await handleAddItem(intentEvent("AddItemIntent", utterance), addItems);
    expect(result).toEqual({ outputSpeech: messages.ADD_ITEM_NOT_HEARD, shouldEndSession: false });
    expect(addItems).not.toHaveBeenCalled();
  });

  it("returns ADD_ITEM_NOTHING_ADDED when nothing was added", async () => {
    const nothingAdded = vi.fn(async () => "");
    const result = await handleAddItem(intentEvent("AddItemIntent", "スポンジボブ"), nothingAdded);
    expect(result).toEqual({
      outputSpeech: messages.ADD_ITEM_NOTHING_ADDED,
      shouldEndSession: false,
    });
  });
});
