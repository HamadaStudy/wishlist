# デプロイ手順
1. zipファイルを作成する
```bash
pip install -r requirements.txt -t lambda_package
cp -r src/wishlist_app lambda_package/
cd lambda_package
zip -r ../lambda.zip .
```
2. AWS Lambdaにアップロードする