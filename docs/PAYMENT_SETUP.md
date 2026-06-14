# 支付配置指南

RedSkill Factory 支持两种支付模式：

## 模式 1: QR 码模式（个人收款，零门槛）

**无需任何商户账号**，立即可用。

1. 打开微信/支付宝 → 我的 → 收付款 → 收款码
2. 截图保存收款码
3. 在卖家中心上传收款码（base64 格式）
4. 在技能落地页填写你的微信昵称/支付宝账号

**交易流程：**
- 买家看到你的收款信息
- 买家转账到你的微信/支付宝
- 买家输入交易流水号
- 系统签发许可证

**优点：** 零手续费，即时到账，无需审核
**缺点：** 需要手动确认收款


## 模式 2: API 模式（商户收款，自动确认）

**需要企业/个体工商户资质**

### 微信支付

1. 注册微信支付商户平台：https://pay.weixin.qq.com
2. 获取：
   - AppID（微信公众平台）
   - 商户号（MCH ID）
   - API v3 密钥
3. 配置 `.env`:
```bash
WECHAT_APP_ID=wxXXXXXXXX
WECHAT_MCH_ID=1234567890
WECHAT_API_KEY_V3=your-api-v3-key
```

### 支付宝

1. 注册支付宝开放平台：https://open.alipay.com
2. 创建应用，获取：
   - AppID
   - 应用私钥（RSA2）
   - 支付宝公钥
3. 配置 `.env`:
```bash
ALIPAY_APP_ID=2021XXXXXXXX
ALIPAY_PRIVATE_KEY=your-rsa-private-key
ALIPAY_PUBLIC_KEY=alipay-public-key
```

### API 模式交易流程

- 买家扫码支付 → 支付平台回调 → 系统自动验证 → 自动签发 License
- 无需手动确认，全程自动化

**优点：** 全自动，体验好，可信度高
**缺点：** 需要营业执照，有手续费（0.6%）


## 当前模式检查

运行以下命令查看当前支付模式：
```bash
curl http://localhost:3001/api/v1/payment/methods
```

返回示例：
```json
{
  "methods": [
    { "method": "wechat", "name": "微信支付", "mode": "qr" },
    { "method": "alipay", "name": "支付宝", "mode": "qr" }
  ]
}
```

`mode: "qr"` = 个人收款码模式
`mode: "api"` = 商户 API 模式（配置商户号后自动切换）
