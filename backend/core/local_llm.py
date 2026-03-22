from __future__ import annotations

import json
import logging
import threading
from typing import Any, Dict, Iterator, List

import ollama

logger = logging.getLogger("boggers.llm")


class LocalLLM:
    def __init__(
        self,
        model: str = "llama3.2",
        temperature: float = 0.3,
        max_tokens: int = 512,
        adapter_path: str | None = None,
        base_model: str | None = None,
        base_url: str = "http://localhost:11434",
    ) -> None:
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.adapter_path = adapter_path
        self.base_model = base_model or model
        self._base_url = base_url
        self._client = ollama.Client(host=self._base_url)
        self._stream_lock = threading.Lock()
        self.previous_adapter_path: str | None = None
        self._unsloth_model = None
        self._unsloth_tokenizer = None
        if self.adapter_path:
            self.load_adapter(self.adapter_path, base_model=self.base_model)

    def decompose_query_to_concepts(self, query: str) -> list[str]:
        """LLM step 1: split user prompt into graph-searchable concept labels."""
        prompt = (
            "Break the user's message into 3-8 short concept labels for searching a knowledge graph.\n"
            'Return ONLY valid JSON: {"concepts":["label one","label two",...]}\n'
            "Rules: lowercase phrases, 1-4 words each, no duplicates, no explanation.\n\n"
            f"User message:\n{query}\n"
        )
        content = self._run_generation(prompt)
        parsed = self._parse_json(content)
        raw = parsed.get("concepts", [])
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw[:12]:
            s = str(item).strip().lower()
            if s and s not in out:
                out.append(s)
        return out

    def summarize_and_hypothesize(self, context: str, query: str) -> dict:
        prompt = (
            "You ground answers in the graph context below. The query was decomposed into "
            "concepts for retrieval; cite themes that appear in the context nodes.\n"
            "Return strict JSON with keys: answer (string), confidence (float 0..1), "
            "reasoning_trace (string), hypotheses (array of 2-3 objects with keys: "
            "text (string), confidence (float 0..1)).\n\n"
            f"Query:\n{query}\n\nContext:\n{context}\n"
        )
        content = self._run_generation(prompt)
        parsed = self._parse_json(content)
        answer = str(parsed.get("answer", "")).strip()
        confidence = float(parsed.get("confidence", 0.0))
        reasoning_trace = str(parsed.get("reasoning_trace", "")).strip()
        raw_hypotheses = parsed.get("hypotheses", [])
        hypotheses: List[Dict[str, Any]] = []
        if isinstance(raw_hypotheses, list):
            for item in raw_hypotheses[:3]:
                if not isinstance(item, dict):
                    continue
                text = str(item.get("text", "")).strip()
                if not text:
                    continue
                hypotheses.append(
                    {
                        "text": text,
                        "confidence": float(item.get("confidence", 0.0)),
                        "supporting_nodes": [],
                    }
                )
        return {
            "answer": answer,
            "confidence": max(0.0, min(confidence, 1.0)),
            "reasoning_trace": reasoning_trace,
            "hypotheses": hypotheses,
        }

    def load_adapter(
        self,
        adapter_path: str,
        base_model: str | None = None,
        max_seq_length: int = 2048,
    ) -> None:
        if self.adapter_path and self.adapter_path != adapter_path:
            self.previous_adapter_path = self.adapter_path
        self.adapter_path = adapter_path
        if base_model:
            self.base_model = base_model
        try:
            from peft import PeftModel
            from unsloth import FastLanguageModel

            model, tokenizer = FastLanguageModel.from_pretrained(
                model_name=self.base_model,
                max_seq_length=max_seq_length,
                dtype=None,
                load_in_4bit=True,
            )
            model = PeftModel.from_pretrained(model, adapter_path)
            self._unsloth_model = model
            self._unsloth_tokenizer = tokenizer
        except Exception as exc:
            logger.warning("Adapter load failed for %s: %s", adapter_path, exc)
            self._unsloth_model = None
            self._unsloth_tokenizer = None

    def load_previous_adapter(self) -> bool:
        if not self.previous_adapter_path:
            return False
        try:
            self.load_adapter(self.previous_adapter_path, base_model=self.base_model)
            return True
        except Exception:
            return False

    def _run_generation(self, prompt: str) -> str:
        if self._unsloth_model is not None and self._unsloth_tokenizer is not None:
            try:
                import torch

                inputs = self._unsloth_tokenizer(
                    prompt,
                    return_tensors="pt",
                    truncation=True,
                    max_length=2048,
                )
                with torch.no_grad():
                    outputs = self._unsloth_model.generate(
                        **inputs,
                        max_new_tokens=self.max_tokens,
                        temperature=self.temperature,
                    )
                text = self._unsloth_tokenizer.decode(
                    outputs[0], skip_special_tokens=True
                )
                return text.split("### Response:")[-1].strip()
            except Exception as exc:
                logger.warning(
                    "Unsloth generation failed, falling back to Ollama: %s", exc
                )

        response = self._client.chat(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            options={
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
            },
        )
        return response.get("message", {}).get("content", "").strip()

    def stream_grounded_answer(
        self, context_text: str, query: str
    ) -> Iterator[str]:
        """Stream plain-text answer chunks (language surface) after graph context is fixed."""
        prompt = (
            "You ground answers in the graph context below. "
            "Write a clear, direct answer in plain text only. "
            "Do not output JSON or code fences.\n\n"
            f"Query:\n{query}\n\nContext:\n{context_text}\n"
        )
        if self._unsloth_model is not None and self._unsloth_tokenizer is not None:
            yield self._run_generation(prompt)
            return
        with self._stream_lock:
            stream = self._client.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                options={
                    "temperature": self.temperature,
                    "num_predict": self.max_tokens,
                },
                stream=True,
            )
            for chunk in stream:
                msg = chunk.get("message") if isinstance(chunk, dict) else None
                if isinstance(msg, dict):
                    delta = msg.get("content") or ""
                    if delta:
                        yield delta

    def ground_streamed_answer(
        self, context_text: str, query: str, answer: str
    ) -> dict:
        """TS second pass: substrate fixed; answer text fixed — score grounding + hypotheses only."""
        safe_answer = (answer or "").strip()
        if len(safe_answer) > 12000:
            safe_answer = safe_answer[:12000] + "…"
        prompt = (
            "The answer below was produced from the graph context. Do NOT rewrite the answer.\n"
            "Return ONLY valid JSON with keys: confidence (float 0..1), reasoning_trace (string), "
            "hypotheses (array of 2-3 objects with keys text (string), confidence (float 0..1)).\n"
            "Score how well the answer is grounded in the context.\n\n"
            f"Query:\n{query}\n\nContext:\n{context_text}\n\nAnswer:\n{safe_answer}\n"
        )
        with self._stream_lock:
            content = self._run_generation(prompt)
        parsed = self._parse_json(content)
        confidence = float(parsed.get("confidence", 0.0))
        reasoning_trace = str(parsed.get("reasoning_trace", "")).strip()
        raw_hypotheses = parsed.get("hypotheses", [])
        hypotheses: List[Dict[str, Any]] = []
        if isinstance(raw_hypotheses, list):
            for item in raw_hypotheses[:3]:
                if not isinstance(item, dict):
                    continue
                text = str(item.get("text", "")).strip()
                if not text:
                    continue
                hypotheses.append(
                    {
                        "text": text,
                        "confidence": float(item.get("confidence", 0.0)),
                        "supporting_nodes": [],
                    }
                )
        return {
            "confidence": max(0.0, min(confidence, 1.0)),
            "reasoning_trace": reasoning_trace,
            "hypotheses": hypotheses,
        }

    def health_check(self) -> dict:
        status = {
            "model": self.model,
            "adapter_loaded": self._unsloth_model is not None,
            "adapter_path": self.adapter_path,
            "previous_adapter": self.previous_adapter_path,
            "can_generate": False,
        }
        try:
            result = self._run_generation("Reply with OK")
            status["can_generate"] = bool(result.strip())
        except Exception as exc:
            status["error"] = str(exc)
        return status

    def synthesize_evolved_content(
        self,
        parent_content: str,
        neighbor_contents: List[str],
        topics: str,
    ) -> str:
        neighbors_text = "\n".join(f"- {c[:200]}" for c in neighbor_contents[:3])
        prompt = (
            "You are a knowledge synthesis engine. "
            "A graph node has collapsed under tension. "
            "Generate a single concise paragraph (2-4 sentences) "
            "that synthesizes a new insight "
            "from the collapsed parent and its neighbors.\n\n"
            f"Collapsed parent: {parent_content[:300]}\n"
            f"Neighbor context:\n{neighbors_text}\n"
            f"Topics: {topics}\n\n"
            "New synthesized insight:"
        )
        try:
            result = self._run_generation(prompt)
            cleaned = result.strip()
            if len(cleaned) > 10:
                return cleaned[:500]
        except Exception as exc:
            logger.warning("Evolve synthesis failed: %s", exc)
        return f"Evolved synthesis from: {parent_content[:100]}"

    def embed_text(self, text: str) -> List[float]:
        try:
            response = self._client.embeddings(model="nomic-embed-text", prompt=text)
            vec = response.get("embedding", [])
            if isinstance(vec, list) and len(vec) > 0:
                return vec
        except Exception as exc:
            logger.debug("Embedding via ollama failed: %s", exc)
        return []

    def _parse_json(self, content: str) -> Dict[str, Any]:
        try:
            return json.loads(content)
        except Exception:
            start = content.find("{")
            end = content.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(content[start : end + 1])
                except Exception:
                    pass
        return {}
