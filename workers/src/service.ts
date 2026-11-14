import type { Env } from "./env";
import { addItemsToDatasource, type AddResult } from "./db/notion";
import { extractShoppingList } from "./llm/structText";

export async function addItems(message: string, env: Env): Promise<string> {
  const shoppingList = await extractShoppingList(message, env.OPENAI_API_KEY);
  const results = await addItemsToDatasource(shoppingList, env.NOTION_API_KEY);
  return structSuccessMessage(results);
}

export function structSuccessMessage(results: AddResult[]): string {
  return results
    .filter((res) => res.status === "success")
    .map((res) => res.item)
    .join(", ");
}
