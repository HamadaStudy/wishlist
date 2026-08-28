from .llm.struct_text import extract_shopping_list
from .db.add_item_to_data_source import add_items_to_datasource


def add_items(message):
    response = extract_shopping_list(message)
    results = add_items_to_datasource(response)
    return struct_success_message(results)


def struct_success_message(response):
    items = [res["item"] for res in response if res["status"] == "success"]

    return f"{', '.join(items)}"
