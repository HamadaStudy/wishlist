from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()
client = OpenAI()


class ShoppingList(BaseModel):
    groceries: list[str] = Field(
        default_factory=list,
        description="食品、生鮮食品、調味料、飲料など",
    )
    consumables: list[str] = Field(
        default_factory=list,
        description="日用品、消耗品（トイレットペーパー、洗剤など）",
    )
    tools: list[str] = Field(
        default_factory=list,
        description="工具、道具、文房具など。判断に迷うアイテムもここに入れる",
    )
    furniture: list[str] = Field(
        default_factory=list, description="家具、大型インテリアなど"
    )


SYSTEM_PROMPT = """
あなたはテキストからアイテムを抽出・分類するアシスタントです。
入力されたテキストから買い物アイテムを抽出し、指定されたカテゴリに分類してください。

# 判断基準（以下の順で判定）
1. groceries: 口に入れるもの（生鮮食品、加工食品、調味料、飲料など）。
2. furniture: 部屋に「設置」して長期間使用するもの（デスク、椅子、棚など）。
3. consumables: 使用するにつれて「消耗・消費」し、補充が必要なもの（トイレットペーパー、洗剤など）。
4. tools: 上記に該当しない道具類（ドライバー、文房具など）。分類に迷うものもすべてここに入れてください。

# 注意事項
- 該当するアイテムがないカテゴリも、必ず空配列 `[]` として出力してください。
- 入力テキストに存在しないアイテムを追加しないでください。
"""


def extract_shopping_list(user_message: str):
    response = client.responses.parse(
        model="gpt-5.4-mini-2026-03-17",
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        text_format=ShoppingList,
    )
    return response.output_parsed.model_dump()
