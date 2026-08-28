from dataclasses import dataclass
import json
import logging

from . import messages
from . import service

logger = logging.getLogger()
logger.setLevel(logging.INFO)


@dataclass
class HandlerResult:
    output_speech: str
    should_end_session: bool


def build_response(output_speech, should_end_session):
    return {
        "version": "1.0",
        "response": {
            "outputSpeech": {
                "type": "PlainText",
                "text": output_speech,
            },
            "shouldEndSession": should_end_session,
        },
    }


def handle_add_item(event):
    intent = event["request"]["intent"]
    slot = intent.get("slots", {}).get("Query", {})
    user_utterance = slot.get("value")

    if not user_utterance:
        return HandlerResult(
            messages.ADD_ITEM_NOT_HEARD,
            False,
        )

    added_items = service.add_items(user_utterance)

    output_speech = messages.ADD_ITEM_SUCCESS.format(items=added_items)

    return HandlerResult(
        output_speech,
        False,
    )


def handle_help(event):
    return HandlerResult(
        messages.HELP,
        False,
    )


def handle_stop(event):
    return HandlerResult(
        messages.STOP,
        True,
    )


def handle_navigate_home(event):
    return HandlerResult(
        messages.NAVIGATE_HOME,
        True,
    )


INTENTS = {
    "AddItemIntent": handle_add_item,
    "AMAZON.HelpIntent": handle_help,
    "AMAZON.CancelIntent": handle_stop,
    "AMAZON.StopIntent": handle_stop,
    "AMAZON.NavigateHomeIntent": handle_navigate_home,
}


def lambda_handler(event, context):
    logger.info(json.dumps(event))

    request = event["request"]

    # 1. LaunchRequest
    if request["type"] == "LaunchRequest":
        return build_response(
            messages.LAUNCH,
            False,
        )

    # 2. IntentRequest
    if request["type"] == "IntentRequest":
        intent = request["intent"]
        handler = INTENTS.get(intent["name"])

        if handler is None:
            return build_response(
                messages.UNKNOWN_INTENT,
                True,
            )

        try:
            result = handler(event)

            return build_response(
                result.output_speech,
                result.should_end_session,
            )

        except Exception:
            logger.exception("Intent handling failed")

            return build_response(
                messages.ERROR,
                True,
            )

    # 3. SessionEndedRequest
    if request["type"] == "SessionEndedRequest":
        logger.info("Session ended")
        return None

    # 4. Other
    return build_response(
        messages.UNKNOWN_REQUEST,
        False,
    )
