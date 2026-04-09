# ─────────────────────────────────────────
# WANDERIX — AI Engine Dockerfile
# FastAPI + Python 3.11
# ─────────────────────────────────────────

# Stage 1 — Build
FROM python:3.11-slim AS builder

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dépendances Python
COPY ai-engine/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─────────────────────────────────────────
# Stage 2 — Production
# ─────────────────────────────────────────

FROM python:3.11-slim AS production

WORKDIR /app

# Sécurité — user non-root
RUN groupadd -g 1001 wanderix && \
    useradd -r -u 1001 -g wanderix wanderix

# Copier les dépendances installées
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copier le code source
COPY ai-engine/ ./

# Permissions
RUN chown -R wanderix:wanderix /app
USER wanderix

# Variables d'environnement
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8000

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "core.api_server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]