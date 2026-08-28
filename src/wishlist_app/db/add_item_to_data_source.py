import os
import time

import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("NOTION_API_KEY")

url = "https://api.notion.com/v1/pages"

config = {
    "data_source_id": "38966996-3c57-8016-a701-000b2b07cf2d",
    "category_to_template_id": {
        "groceries": "38966996-3c57-8056-b77f-e563dc6d9c17",
        "consumables": "38966996-3c57-80aa-95d6-c03b7d89f8eb",
        "tools": "38966996-3c57-8083-83e1-c56b76727796",
        "furniture": "3a166996-3c57-803d-8c63-ed111de83291",
    },
}


def _get_template_id(category: str):
    template_id = config["category_to_template_id"][category]
    if not template_id:
        raise ValueError(f"No template found for category: {category}")
    return template_id


def _build_payload_with_template(
    name: str, template_id: str, datasource_id: str = config["data_source_id"]
):
    payload = {
        "parent": {
            "type": "data_source_id",
            "data_source_id": datasource_id,
        },
        "properties": {"名前": {"title": [{"text": {"content": name}}]}},
        "template": {
            "type": "template_id",
            "template_id": template_id,
        },
    }
    return payload


def _build_payloads_from_json(
    data: dict, datasource_id: str = config["data_source_id"]
):
    payloads = []
    for category, items in data.items():
        template_id = _get_template_id(category)
        for item in items:
            payload = _build_payload_with_template(item, template_id)
            payloads.append(payload)
    return payloads


def add_items_to_datasource(data: dict):
    """構造化されたJSONデータをNotionに追加する"""

    url = "https://api.notion.com/v1/pages"
    results = []

    payloads = _build_payloads_from_json(data)
    headers = {
        "Notion-Version": "2026-03-11",
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    for payload in payloads:
        item_name = payload["properties"]["名前"]["title"][0]["text"]["content"]
        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            print(f"✅ 追加成功: {item_name}")
            results.append({"status": "success", "item": item_name})
        except requests.exceptions.HTTPError as e:
            print(f"❌ 追加失敗: {item_name} ({e})")
            results.append({"status": "failed", "item": item_name, "error": str(e)})

        time.sleep(0.35)
    return results
