export const CATEGORIES = ["groceries", "consumables", "tools", "furniture"] as const;
export type Category = (typeof CATEGORIES)[number];
export type ShoppingList = Record<Category, string[]>;

const MODEL = "gpt-5.4-mini-2026-03-17";

const SYSTEM_PROMPT = `
あなたはテキストからアイテムを抽出・分類するアシスタントです。
入力されたテキストから買い物アイテムを抽出し、指定されたカテゴリに分類してください。

# 判断基準（以下の順で判定）
1. groceries: 口に入れるもの（生鮮食品、加工食品、調味料、飲料など）。
2. furniture: 部屋に「設置」して長期間使用するもの（デスク、椅子、棚など）。
3. consumables: 使用するにつれて「消耗・消費」し、補充が必要なもの（トイレットペーパー、洗剤など）。
4. tools: 上記に該当しない道具類（ドライバー、文房具など）。分類に迷うものもすべてここに入れてください。

# 注意事項
- 入力は音声認識の結果のため、聞き間違いにより買い物アイテムとして不自然な語（例：キャラクター名、固有名詞）になっている場合があります。
  その場合でも除外せず、聞き取った語をそのままいずれかのカテゴリに登録してください。分類に迷う場合は tools に入れてください。
- 「追加して」「買う」などの動詞や助詞はアイテムに含めないでください。
- 全カテゴリを空にしてよいのは、入力に名詞が一つも含まれない場合のみです。
- 該当するアイテムがないカテゴリは、空配列 \`[]\` として出力してください。
- 入力テキストに存在しないアイテムを追加しないでください。
`;

const stringList = (description: string) => ({
  type: "array",
  items: { type: "string" },
  description,
});

// Python版の pydantic モデル ShoppingList と同じスキーマ
const SHOPPING_LIST_SCHEMA = {
  type: "object",
  properties: {
    groceries: stringList("食品、生鮮食品、調味料、飲料など"),
    consumables: stringList("日用品、消耗品（トイレットペーパー、洗剤など）"),
    tools: stringList("工具、道具、文房具など。判断に迷うアイテムもここに入れる"),
    furniture: stringList("家具、大型インテリアなど"),
  },
  required: [...CATEGORIES],
  additionalProperties: false,
};

interface ResponsesApiOutput {
  output?: { type: string; content?: { type: string; text?: string }[] }[];
}

export async function extractShoppingList(
  userMessage: string,
  apiKey: string,
): Promise<ShoppingList> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "shopping_list",
          schema: SHOPPING_LIST_SCHEMA,
          strict: true,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as ResponsesApiOutput;
  const text = data.output
    ?.find((o) => o.type === "message")
    ?.content?.find((c) => c.type === "output_text")?.text;

  if (!text) {
    throw new Error("OpenAI API returned no output_text");
  }
  return JSON.parse(text) as ShoppingList;
}
