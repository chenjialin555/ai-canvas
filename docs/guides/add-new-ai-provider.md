# 如何新增一个 AI 图像 Provider（单步生图）

单步生图路径：**前端** `POST /api/generate-image`（`GenerateImageRequest`）→ **后端** `GenerationService` → **`provider_registry`** → 具体 Provider 类。

## 1. 后端协议与注册

1. **实现类**（参考 `backend/app/providers/doubao.py` 等）：
   - 类属性 `name: str`（与注册表 key 一致）。
   - 类属性 `models: list[str]`（该供应商下可选模型 id）。
   - 方法 `generate(self, req: GenerateImageRequest, settings: Settings) -> tuple[str, Any, str]`：返回 `(结果 image_url, raw, model)`。
2. **注册**：在 `backend/app/providers/registry.py` 的 `ProviderRegistry._providers` 中加入 `"你的key": YourProvider()`。
3. **Pydantic 字面量**：在 `backend/app/schemas/common.py` 的 `Provider` 中追加新字面量，否则请求校验会拒绝未知 `provider`。

## 2. 前端表单与模型列表

1. `src/ai/generation/generationTypes.ts`：
   - 扩展 `ImageProvider` 联合类型。
   - 在 `PROVIDERS` 数组中增加展示项。
   - 在 `MODEL_CHOICES` 中为该 id 配置 `{ value, label }[]`（与后端 `models` 对齐）。
2. 若工作流节点参数里写死了 provider 下拉（如 `inpaint` 的 `select`），按需同步 `src/workflow/nodes/*.ts` 中的 `options`。

## 3. 请求体与错误

- 请求模型：`backend/app/schemas/generation.py` 的 `GenerateImageRequest`；通用字段已包含 `prompt`、`image`、`mask`、`referenceImages`、`mode`、`guidanceScale` 等。特殊字段可放在 `extra`（若前后端约定）。
- 错误展示：前端 `generationApi` / `generationService` 已区分非 JSON、HTTP 错误等；后端尽量返回明确 `detail`，便于排查。

## 4. 自检清单

- `Provider` 字面量、registry、`ImageProvider` / `MODEL_CHOICES` 三处 id **一致**。
- `npm run build`（前端）+ 本地起后端，用新 provider 跑一轮文生图/图生图（视实现而定）。
