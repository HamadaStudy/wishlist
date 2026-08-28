from wishlist_app.handler import lambda_handler

dummy_event = {
    "request": {
        "type": "IntentRequest",
        "intent": {
            "name": "AddItemIntent",
            "slots": {
                "Query": {
                    "value": "えーっと、今日の買い物なんだっけ…あ、まず食パンと牛乳とたまごでしょ、あとレタスと鶏もも肉。それから日用品側で洗剤とポリ袋、えーとトイレットペーパーと歯磨き粉もだ。工具とかあったっけ…あ、ネジ回しと養生テープ、それからカッターも買わなきゃ。あとは家具か、デスクライトとクッション…あ、それと折りたたみチェアも！これで全部かな。",
                }
            },
        },
    }
}


def main():
    lambda_handler(dummy_event, None)


if __name__ == "__main__":
    main()
