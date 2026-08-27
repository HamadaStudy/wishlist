import pytest

from wishlist_app import handler
from wishlist_app import messages


@pytest.fixture
def intent_event():
    return {
        "request": {
            "type": "IntentRequest",
            "intent": {
                "name": "AddItemIntent",
                "slots": {
                    "Query": {
                        "value": "牛乳",
                    }
                },
            },
        }
    }


# ============================================================
# Request Type
# ============================================================


@pytest.mark.parametrize(
    "request_type",
    [
        "LaunchRequest",
        "IntentRequest",
        "SessionEndedRequest",
        "UnknownRequest",
    ],
)
def test_request_type(intent_event, request_type):
    if request_type == "IntentRequest":
        event = intent_event
    else:
        event = {
            "request": {
                "type": request_type,
            }
        }

    response = handler.lambda_handler(event, None)

    if request_type == "LaunchRequest":
        assert response == handler.build_response(
            messages.LAUNCH,
            False,
        )

    elif request_type == "IntentRequest":
        assert response is not None

    elif request_type == "SessionEndedRequest":
        assert response is None

    else:
        assert response == handler.build_response(
            messages.UNKNOWN_REQUEST,
            False,
        )


# ============================================================
# Intent Name
# ============================================================


@pytest.mark.parametrize(
    "intent_name, expected_result",
    [
        (
            "AddItemIntent",
            handler.HandlerResult(
                output_speech=messages.ADD_ITEM_SUCCESS.format(item="牛乳"),
                should_end_session=False,
            ),
        ),
        (
            "AMAZON.HelpIntent",
            handler.HandlerResult(
                output_speech=messages.HELP,
                should_end_session=False,
            ),
        ),
        (
            "AMAZON.CancelIntent",
            handler.HandlerResult(
                output_speech=messages.STOP,
                should_end_session=True,
            ),
        ),
        (
            "AMAZON.StopIntent",
            handler.HandlerResult(
                output_speech=messages.STOP,
                should_end_session=True,
            ),
        ),
        (
            "AMAZON.NavigateHomeIntent",
            handler.HandlerResult(
                output_speech=messages.NAVIGATE_HOME,
                should_end_session=True,
            ),
        ),
    ],
)
def test_intent_name(intent_event, intent_name, expected_result):
    intent_event["request"]["intent"]["name"] = intent_name

    response = handler.lambda_handler(intent_event, None)

    assert response == handler.build_response(
        expected_result.output_speech,
        expected_result.should_end_session,
    )


def test_unknown_intent(intent_event):
    intent_event["request"]["intent"]["name"] = "UnknownIntent"

    response = handler.lambda_handler(intent_event, None)

    assert response == handler.build_response(
        messages.UNKNOWN_INTENT,
        True,
    )


def test_intent_name_missing(intent_event):
    del intent_event["request"]["intent"]["name"]

    with pytest.raises(KeyError):
        handler.lambda_handler(intent_event, None)


# ============================================================
# handle_add_item
# ============================================================


@pytest.mark.parametrize(
    "user_utterance",
    [
        "牛乳",
        "たまご",
        "鶏むね肉",
        "ドライバー",
        "単4電池",
    ],
)
def test_handle_add_item(user_utterance):
    event = {
        "request": {
            "type": "IntentRequest",
            "intent": {
                "name": "AddItemIntent",
                "slots": {
                    "Query": {
                        "value": user_utterance,
                    }
                },
            },
        }
    }

    result = handler.handle_add_item(event)

    assert result == handler.HandlerResult(
        output_speech=messages.ADD_ITEM_SUCCESS.format(item=user_utterance),
        should_end_session=False,
    )


@pytest.mark.parametrize(
    "user_utterance",
    [
        None,
        "",
    ],
)
def test_handle_add_item_without_utterance(user_utterance):
    event = {
        "request": {
            "type": "IntentRequest",
            "intent": {
                "name": "AddItemIntent",
                "slots": {
                    "Query": {
                        "value": user_utterance,
                    }
                },
            },
        }
    }

    result = handler.handle_add_item(event)

    assert result == handler.HandlerResult(
        output_speech=messages.ADD_ITEM_NOT_HEARD,
        should_end_session=False,
    )
