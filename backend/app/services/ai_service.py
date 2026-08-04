import asyncio
import json
import re
import urllib.request
from typing import Any

from ..config import settings

SYSTEM_PROMPT = """You are "Loom", the AI marketplace assistant for TextileHub, a B2B textile marketplace connecting fabric buyers with suppliers.

You help buyers:
- Find fabrics (cotton, silk, linen, wool, denim, polyester, viscose, blends, etc.) by describing what they need
- Compare products and suggest similar options
- Answer questions about products, MOQs, pricing, stock, and specifications
- Explain marketplace features like carts, orders, and supplier management

Rules:
- Be concise, friendly, and practical. Use short bullet points when useful.
- Only recommend products using the marketplace catalog data provided to you.
- If the user asks for products, list specific products with name and price when data is provided.
- If you don't know something, say so honestly.
"""


class AIService:
    def __init__(self) -> None:
        self.token = settings.HF_TOKEN
        self.headers = (
            {"Authorization": f"Bearer {self.token}"} if self.token else {}
        )

    @property
    def enabled(self) -> bool:
        return bool(self.token)

    # ---------- low level HF calls ----------

    @staticmethod
    def _post_json(url: str, payload: dict, headers: dict, timeout: int = 60) -> str:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={**headers, "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8")

    async def _hf_chat(self, prompt: str, model: str | None = None) -> str | None:
        model = model or settings.HF_CHAT_MODEL
        url = f"{settings.HF_API_URL}/v1/chat/completions"
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 350,
            "temperature": 0.4,
        }
        try:
            body = await asyncio.to_thread(
                self._post_json, url, payload, self.headers
            )
            data = json.loads(body)
            message = (data.get("choices") or [{}])[0].get("message") or {}
            reply = message.get("content") or message.get("reasoning_content") or ""
            return reply.strip() or None
        except Exception as exc:
            return None

    # ---------- helpers ----------

    def _strip_chat_prefix(self, text: str) -> str:
        markers = [
            "<|assistant|>", "<|user|>", "<|system|>",
            "Assistant:", "User:", "System:",
        ]
        for m in markers:
            text = text.replace(m, "")
        idx = text.find("Question:")
        if idx != -1:
            text = text[:idx]
        return text.strip()

    # ---------- keyword fallbacks ----------

    def _tokenize(self, text: str) -> set[str]:
        words = re.findall(r"[a-z0-9]+", text.lower())
        stop = {
            "the", "a", "an", "and", "or", "for", "with", "of", "to", "in", "on",
            "i", "we", "my", "me", "want", "need", "looking", "like", "for", "is",
            "are", "this", "that", "can", "you", "help", "please", "some", "any",
            "fabric", "fabrics", "cloth", "price", "cheap", "cost",
        }
        return {w for w in words if w not in stop and len(w) > 1}

    def _keyword_score(self, query: str, product: dict) -> float:
        q_tokens = self._tokenize(query)
        if not q_tokens:
            return 0.0

        def to_str(value: Any) -> str:
            if isinstance(value, str):
                return value
            if isinstance(value, dict):
                return value.get("name", "")
            if isinstance(value, list):
                return " ".join(to_str(v) for v in value)
            return str(value)

        product_text = " ".join(
            [
                to_str(product.get("name")),
                to_str(product.get("fabric_type")),
                to_str(product.get("category")),
                to_str(product.get("description")),
                to_str(product.get("colors")),
                to_str(product.get("specifications")),
            ]
        ).lower()
        score = 0.0
        for token in q_tokens:
            if token in product_text:
                score += 1.0
        if "cotton" in q_tokens and "cotton" in product_text:
            score += 1.5
        if "silk" in q_tokens and "silk" in product_text:
            score += 1.5
        return score / len(q_tokens)

    # ---------- public API ----------

    async def chat(self, messages: list[dict], catalog: list[dict] | None = None) -> dict:
        catalog = catalog or []
        catalog_blurb = self._catalog_blurb(catalog)
        user_turn = messages[-1]["content"] if messages else ""
        if self.enabled:
            prompt = f"{SYSTEM_PROMPT}\n\nMarketplace catalog:\n{catalog_blurb}\n\n"
            for msg in messages:
                prefix = "User: " if msg["role"] == "user" else "Assistant: "
                prompt += f"{prefix}{msg['content']}\n"
            prompt += "Assistant:"
            reply = await self._hf_chat(prompt)
            if reply:
                cleaned = self._strip_chat_prefix(reply)
                if cleaned:
                    return {"reply": cleaned, "source": "ai"}

        return {
            "reply": self._fallback_chat_reply(user_turn, catalog),
            "source": "rule",
        }

    def _catalog_blurb(self, catalog: list[dict]) -> str:
        lines = []
        for p in catalog[:60]:
            lines.append(
                f"- {p.get('name')} | {p.get('fabric_type')} | "
                f"{p.get('category')} | Rs. {p.get('price')} | "
                f"stock {p.get('stock')} | MOQ {p.get('moq')} | {p.get('description', '')[:100]}"
            )
        return "\n".join(lines) if lines else "(catalog empty)"

    def _fallback_chat_reply(self, query: str, catalog: list[dict]) -> str:
        if not catalog:
            return (
                "I can help you discover fabrics, compare products, and answer "
                "questions about orders. There are no products listed yet — try "
                "again after suppliers add inventory."
            )
        scored = sorted(
            ((self._keyword_score(query, p), p) for p in catalog),
            key=lambda x: -x[0],
        )
        top = [p for s, p in scored if s > 0][:3]
        if top:
            lines = "\n".join(
                f"- {p['name']} ({p['fabric_type']}) — Rs. {p['price']} per unit, MOQ {p['moq']}"
                for p in top
            )
            return f"Here are a few fabrics that match what you described:\n{lines}\n\nOpen any product for full details, or tell me more about your needs!"
        return (
            "I couldn't find an exact match in the catalog from your description. "
            "Try mentioning a fabric type (cotton, silk, linen, denim...), a category, "
            "a price range, or a color, and I'll search again."
        )

    async def semantic_search(self, query: str, products: list[dict], limit: int = 10) -> list[dict]:
        scored: list[tuple[float, dict]] = [
            (self._keyword_score(query, p), p) for p in products
        ]
        scored.sort(key=lambda x: -x[0])
        results = [p for s, p in scored if s > 0.01][:limit]
        return results or products[: min(limit, len(products))]

    async def recommend(
        self,
        products: list[dict],
        profile: dict | None = None,
        context: str = "",
        limit: int = 6,
    ) -> list[dict]:
        profile = profile or {}
        interests = " ".join(
            list(profile.get("preferred_fabrics", []))
            + list(profile.get("interested_categories", []))
        )
        query = f"{interests} {context} {profile.get('industry', '')}"
        results = await self.semantic_search(query, products, limit=limit)
        return results

    async def similar_products(self, product: dict, products: list[dict], limit: int = 4) -> list[dict]:
        query = f"{product.get('fabric_type', '')} {product.get('category', '')} {product.get('name', '')}"
        others = [p for p in products if p.get("id") != product.get("id")]
        results = await self.semantic_search(query, others, limit=limit)
        return results

    async def compare_products(self, products: list[dict]) -> str:
        if not products:
            return "Nothing to compare."
        if self.enabled:
            lines = []
            for p in products:
                lines.append(
                    f"- {p['name']}: {p['fabric_type']}, Rs. {p['price']}, "
                    f"stock {p['stock']}, MOQ {p['moq']}, colors {', '.join(p.get('colors', [])[:4])}, "
                    f"specs: {p.get('specifications')}"
                )
            prompt = (
                f"{SYSTEM_PROMPT}\n\nCompare these {len(products)} textile products side by side. "
                "Give a short verdict recommending the best pick for a bulk buyer.\n\n"
                + "\n".join(lines)
            )
            reply = await self._hf_chat(prompt)
            if reply:
                cleaned = self._strip_chat_prefix(reply)
                if cleaned:
                    return cleaned
        lines = []
        for p in products:
            lines.append(
                f"- **{p['name']}** — {p['fabric_type']}, Rs. {p['price']}/unit, "
                f"MOQ {p['moq']}, stock {p['stock']}"
            )
        return "Here is a quick comparison:\n" + "\n".join(lines)

    async def product_qa(self, product: dict, question: str) -> str:
        context = (
            f"Product: {product['name']}\n"
            f"Description: {product.get('description', '')}\n"
            f"Fabric type: {product.get('fabric_type', '')}\n"
            f"Category: {product.get('category', '')}\n"
            f"Price: Rs. {product.get('price')} per unit\n"
            f"MOQ: {product.get('moq')}\n"
            f"Stock available: {product.get('stock')}\n"
            f"Colors: {', '.join(product.get('colors', []))}\n"
            f"Specifications: {product.get('specifications')}\n"
            f"Supplier: {product.get('supplier_name', 'Unknown')}"
        )
        if self.enabled:
            prompt = (
                f"{SYSTEM_PROMPT}\n\nAnswer the buyer's question using ONLY the product "
                f"details below. Be accurate about stock, MOQ and price.\n\n{context}\n\n"
                f"Question: {question}\nAnswer:"
            )
            reply = await self._hf_chat(prompt)
            if reply:
                cleaned = self._strip_chat_prefix(reply)
                if cleaned:
                    return cleaned
        return self._fallback_qa(product, question)

    def _fallback_qa(self, product: dict, question: str) -> str:
        q = question.lower()
        if any(w in q for w in ["price", "cost", "rate", "much"]):
            return (
                f"{product['name']} is priced at Rs. {product['price']} per unit "
                f"with a minimum order quantity of {product['moq']} units."
            )
        if any(w in q for w in ["stock", "available", "inventory", "quantity"]):
            return (
                f"Currently there are {product['stock']} units of {product['name']} "
                f"in stock."
            )
        if any(w in q for w in ["color", "colour"]):
            colors = product.get("colors", [])
            return (
                f"{product['name']} is available in: {', '.join(colors) if colors else 'standard colors'}."
            )
        if any(w in q for w in ["moq", "minimum", "order quantity", "bulk"]):
            return f"The MOQ for {product['name']} is {product['moq']} units."
        if any(w in q for w in ["delivery", "ship", "dispatch"]):
            return (
                "Place an order through checkout and the supplier will update the "
                "status from pending to completed as your order is prepared."
            )
        specs = product.get("specifications", {})
        if specs:
            lines = ", ".join(f"{k}: {v}" for k, v in specs.items())
            return f"Key specifications: {lines}."
        return (
            f"{product['name']} is a {product.get('fabric_type', 'textile')} fabric "
            f"sold by {product.get('supplier_name', 'our supplier')} at Rs. "
            f"{product['price']} per unit. Ask me about price, stock, colors, or MOQ!"
        )

    # ---------- AI-assisted onboarding ----------

    async def parse_onboarding(
        self, role: str, messages: list[dict]
    ) -> dict:
        fields = self._onboard_fields(role)
        if self.enabled:
            prompt = (
                f"You are a marketplace onboarding assistant for a {role} on a textile "
                f"marketplace. Extract structured data from the conversation below. "
                f"Return ONLY valid JSON with these keys (use empty list/string/null when unknown): "
                f"{json.dumps(fields)}.\n\n"
            )
            for msg in messages[-6:]:
                prefix = "User: " if msg["role"] == "user" else "Assistant: "
                prompt += f"{prefix}{msg['content']}\n"
            prompt += "JSON:"
            reply = await self._hf_chat(prompt)
            parsed = self._try_parse_json(reply)
            if parsed is not None:
                return parsed
        return self._keyword_extract(role, messages)

    def _onboard_fields(self, role: str) -> dict[str, str]:
        if role == "buyer":
            return {
                "business_type": "str",
                "industry": "str",
                "interested_categories": "list[str]",
                "preferred_fabrics": "list[str]",
                "typical_order_qty": "str",
                "budget_range": "str",
            }
        return {
            "business_name": "str",
            "business_type": "str",
            "contact_phone": "str",
            "business_address": "str",
            "operating_hours": "str",
            "product_categories": "list[str]",
            "fabric_types": "list[str]",
            "min_order_qty": "str",
        }

    def _try_parse_json(self, text: str | None) -> dict | None:
        if not text:
            return None
        try:
            cleaned = text.strip()
            start, end = cleaned.find("{"), cleaned.rfind("}")
            if start != -1 and end != -1:
                return json.loads(cleaned[start : end + 1])
        except Exception:
            return None
        return None

    def _keyword_extract(self, role: str, messages: list[dict]) -> dict:
        all_text = " ".join(m["content"] for m in messages if m["role"] == "user").lower()
        result = {}
        if role == "buyer":
            result = {
                "business_type": self._match_any(all_text, ["garment manufacturer", "retailer", "wholesaler", "designer", "exporter", "tailor"]),
                "industry": self._match_any(all_text, ["fashion", "apparel", "home textiles", "interior", "furnishing", "uniform", "fabric"]),
                "interested_categories": self._match_list(all_text, ["cotton", "silk", "linen", "wool", "denim", "polyester", "viscose", "jute", "blend", "chiffon", "satin", "georgette"]),
                "preferred_fabrics": self._match_list(all_text, ["cotton", "silk", "linen", "wool", "denim", "polyester", "viscose", "jute", "chiffon", "satin", "georgette"]),
                "typical_order_qty": self._match_pattern(all_text, r"(\d[\d,\s]*\s?(?:pieces|units|meters|yards|rolls|kg))"),
                "budget_range": self._match_pattern(all_text, r"(under|below|less than|up to|around|between)?\s*(\d[\d,]*\s?(?:rs|inr)?\s*[k]?/?-?\s*\d?[\d,]*\s*(?:rs|inr|per meter|per unit|k|,000)?)", short=True),
            }
        else:
            result = {
                "business_name": "",
                "business_type": self._match_any(all_text, ["manufacturer", "weaver", "mill", "exporter", "trader", "wholesaler", "artisan"]),
                "contact_phone": self._match_pattern(all_text, r"(\+?\d[\d\s\-]{8,})"),
                "business_address": self._match_pattern(all_text, r"([a-z0-9\s,]+(?:street|road|lane|nagar|colony|park|industrial|city|district|state|delhi|mumbai|surat|ahmedabad|jaipur|bangalore|chennai|hyderabad))"),
                "operating_hours": self._match_pattern(all_text, r"((?:mon|monday|9|10|9\s?[ap]m?)[a-z\s:\-0-9]*(?:am|pm|to|till|evening))", short=True),
                "product_categories": self._match_list(all_text, ["cotton", "silk", "linen", "wool", "denim", "polyester", "viscose", "jute", "chiffon", "satin", "georgette", "organic"]),
                "fabric_types": self._match_list(all_text, ["cotton", "silk", "linen", "wool", "denim", "polyester", "viscose", "jute", "chiffon", "satin", "georgette", "organic"]),
                "min_order_qty": self._match_pattern(all_text, r"(\d[\d,\s]*\s?(?:pieces|units|meters|yards|rolls|kg))"),
            }
        list_fields = {"interested_categories", "preferred_fabrics", "product_categories", "fabric_types"}
        return {
            k: (v or ([] if k in list_fields else ""))
            for k, v in result.items()
            if k in self._onboard_fields(role)
        }

    def _match_any(self, text: str, options: list[str]) -> str:
        for opt in sorted(options, key=len, reverse=True):
            if opt in text:
                return opt.title()
        return ""

    def _match_list(self, text: str, options: list[str]) -> list[str]:
        found = [opt for opt in options if opt in text]
        return found

    def _match_pattern(self, text: str, pattern: str, short: bool = False) -> str:
        match = re.search(pattern, text)
        return match.group(1 if not short else 0).strip() if match else ""


ai_service = AIService()
