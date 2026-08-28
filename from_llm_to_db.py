from src.wishlist_app.llm.struct_text import extract_shopping_list
from src.wishlist_app.db.add_item_to_data_source import add_items_to_datasource

dummy_message = "えーっと、今日の買い物なんだっけ…あ、まず食パンと牛乳とたまごでしょ、あとレタスと鶏もも肉。それから日用品側で洗剤とポリ袋、えーとトイレットペーパーと歯磨き粉もだ。工具とかあったっけ…あ、ネジ回しと養生テープ、それからカッターも買わなきゃ。あとは家具か、デスクライトとクッション…あ、それと折りたたみチェアも！これで全部かな。"


def main():
    response = extract_shopping_list(dummy_message)
    add_items_to_datasource(response)


if __name__ == "__main__":
    main()
