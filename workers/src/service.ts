import type { Env } from "./env";
import { addItemsToDatasource, type AddResult } from "./db/notion";
import { CATEGORIES, extractShoppingList, type ShoppingList } from "./llm/structText";

export async function addItems(message: string, env: Env): Promise<string> {
  const extracted = await extractShoppingList(message, env.OPENAI_API_KEY);
  const shoppingList = fallbackIfEmpty(extracted, message);
  const results = await addItemsToDatasource(shoppingList, env.NOTION_API_KEY);
  return structSuccessMessage(results);
}

/**
 * LLM が全カテゴリを空で返した場合、発話をそのまま tools に登録する。
 * 聞き間違いで不自然な語になっていても、Notion 上で人間が後から修正できるようにするため。
 */
export function fallbackIfEmpty(list: ShoppingList, message: string): ShoppingList {
  const isEmpty = CATEGORIES.every((category) => list[category].length === 0);
  const trimmed = message.trim();
  if (!isEmpty || !trimmed) {
    return list;
  }
  return { ...list, tools: [trimmed] };
}

export function structSuccessMessage(results: AddResult[]): string {
  return results
    .filter((res) => res.status === "success")
    .map((res) => res.item)
    .join(", ");
}
