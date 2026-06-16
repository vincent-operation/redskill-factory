/**
 * 小红书开放平台 API Client
 *
 * 官方API接口: https://open.xiaohongshu.com
 * 文档: https://school.xiaohongshu.com/open/product/
 *
 * 使用方式:
 * 1. 注册 open.xiaohongshu.com → 创建自用型应用 → 获取 AppID/AppSecret
 * 2. 配置 .env: XHS_APP_ID, XHS_APP_SECRET
 * 3. 店铺授权 → 获取 access_token
 * 4. 调用 createProduct() 批量创建商品
 */
import { createHash, randomUUID } from "node:crypto";

export interface XhsConfig {
  appId: string;
  appSecret: string;
  shopId?: string;
}

export interface SpuCreateParams {
  title: string;           // 商品标题 最多30字
  categoryId: string;      // 末级类目ID
  brandId?: string;        // 品牌ID
  images: string[];        // 主图URL列表 (至少1张)
  description: string;     // 商品描述
  price: number;           // 价格 (单位:分)
  stock: number;           // 库存
  deliveryType: "virtual" | "physical";  // 物流方式
  status?: "on_sale" | "off_sale";       // 上架状态
  outerId?: string;        // 外部商品ID
  attributes?: Record<string, string>;   // 商品属性
}

export interface SpuCreateResult {
  success: boolean;
  spuId?: string;
  itemId?: string;
  error?: string;
}

export class XhsOpenClient {
  private config: XhsConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private baseUrl = "https://openapi.xiaohongshu.com";

  constructor(config: XhsConfig) {
    this.config = config;
  }

  /** 获取 access_token (有效期2小时) */
  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const res = await fetch(`${this.baseUrl}/oauth2/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
        grant_type: "authorization_self",
      }),
    });

    const data = await res.json() as any;
    if (data.success && data.data?.access_token) {
      this.accessToken = data.data.access_token;
      this.tokenExpiresAt = Date.now() + (data.data.expires_in || 7200) * 1000;
      return this.accessToken!;
    }
    throw new Error(`Auth failed: ${data.msg || JSON.stringify(data)}`);
  }

  /** 创建 SPU 商品 */
  async createSpu(params: SpuCreateParams): Promise<SpuCreateResult> {
    try {
      const token = await this.getAccessToken();
      const body: Record<string, any> = {
        title: params.title,
        category_id: params.categoryId,
        images: params.images,
        description: params.description,
        price: params.price,
        stock: params.stock,
        delivery_type: params.deliveryType,
        status: params.status || "on_sale",
      };

      if (params.brandId) body.brand_id = params.brandId;
      if (params.outerId) body.outer_id = params.outerId;
      if (params.attributes) body.attributes = params.attributes;

      const res = await fetch(`${this.baseUrl}/product/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json() as any;
      if (data.success) {
        return {
          success: true,
          spuId: data.data?.spu_id,
          itemId: data.data?.item_id,
        };
      }
      return { success: false, error: data.msg || "Unknown error" };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  /** 批量创建商品 */
  async batchCreateSpu(products: SpuCreateParams[]): Promise<SpuCreateResult[]> {
    const results: SpuCreateResult[] = [];
    for (const product of products) {
      const result = await this.createSpu(product);
      results.push(result);
      // Rate limit: 100ms between requests
      await new Promise(r => setTimeout(r, 200));
    }
    return results;
  }

  /** 获取类目列表 */
  async getCategories(parentId?: string) {
    const token = await this.getAccessToken();
    const params = parentId ? `?parent_id=${parentId}` : "";
    const res = await fetch(`${this.baseUrl}/product/categories${params}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    return (await res.json() as any)?.data || [];
  }

  /** 查询商品列表 */
  async listProducts(page: number = 1, pageSize: number = 50) {
    const token = await this.getAccessToken();
    const res = await fetch(
      `${this.baseUrl}/product/list?page=${page}&page_size=${pageSize}`,
      { headers: { "Authorization": `Bearer ${token}` } },
    );
    return (await res.json() as any)?.data || { products: [], total: 0 };
  }
}
