# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl gosu \
    && rm -rf /var/lib/apt/lists/*

# Non-editable install so the image is self-contained (no bind-mount to site-packages).
COPY . .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir ".[llm,adapters,agents]" \
        "fastapi>=0.110" \
        "uvicorn[standard]>=0.27" \
        "rich>=13" \
        "slowapi>=0.1.9"

RUN useradd --create-home --uid 1000 --shell /bin/bash boggers \
    && mkdir -p /data/vault /data/traces /data/snapshots /data/dataset /data/models/backups \
    && chown -R boggers:boggers /app /data

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV BOGGERS_DASHBOARD_HOST=0.0.0.0 \
    BOGGERS_DASHBOARD_PORT=8000 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/live', timeout=4)"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["dashboard-start"]
