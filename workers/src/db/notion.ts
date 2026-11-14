import type { Category, ShoppingList } from "../llm/structText";

const NOTION_PAGES_URL = "https://api.notion.com/v1/pages";
const NOTION_VERSION = "2026-03-11";

const config = {
  dataSourceId: "38966996-3c57-8016-a701-000b2b07cf2d",
  categoryToTemplateId: {
    groceries: "38966996-3c57-8056-b77f-e563dc6d9c17",
    consumables: "38966996-3c57-80aa-95d6-c03b7d89f8eb",
    tools: "38966996-3c57-8083-83e1-c56b76727796",
    furniture: "3a166996-3c57-803d-8c63-ed111de83291",
  } satisfies Record<Category, string>,
};

export type AddResult =
  | { status: "success"; item: string }
  | { status: "failed"; item: string; error: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getTemplateId(category: string): string {
  const templateId = config.categoryToTemplateId[category as Category];
  if (!templateId) {
    throw new Error(`No template found for category: ${category}`);
  }
  return templateId;
}

function buildPayloadWithTemplate(
  name: string,
  templateId: string,
  dataSourceId: string = config.dataSourceId,
) {
  return {
    parent: {
      type: "data_source_id",
      data_source_id: dataSourceId,
    },
    properties: { 名前: { title: [{ text: { content: name } }] } },
    template: {
      type: "template_id",
      template_id: templateId,
    },
  };
}

function buildPayloadsFromJson(data: ShoppingList) {
  return Object.entries(data).flatMap(([category, items]) => {
    const templateId = getTemplateId(category);
    return items.map((item) => ({
      item,
      payload: buildPayloadWithTemplate(item, templateId),
    }));
  });
}

/** 構造化されたJSONデータをNotionに追加する */
export async function addItemsToDatasource(
  data: ShoppingList,
  apiKey: string,
): Promise<AddResult[]> {
  const results: AddResult[] = [];
  const headers = {
    "Notion-Version": NOTION_VERSION,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  for (const { item, payload } of buildPayloadsFromJson(data)) {
    try {
      const res = await fetch(NOTION_PAGES_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${await res.text()}`);
      }
      console.log(`✅ 追加成功: ${item}`);
      results.push({ status: "success", item });
    } catch (e) {
      console.log(`❌ 追加失敗: ${item} (${e})`);
      results.push({ status: "failed", item, error: String(e) });
    }

    // Notion API のレートリミット (平均3リクエスト/秒) 対策
    await sleep(350);
  }
  return results;
}
