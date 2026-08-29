FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src \
    INTELLIGENCE_HOST=0.0.0.0 \
    INTELLIGENCE_PORT=8081

WORKDIR /app

RUN addgroup --system intelligence && adduser --system --ingroup intelligence intelligence

COPY src ./src

USER intelligence

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8081/health', timeout=2).read()"]

CMD ["python", "-m", "tax_lien_intelligence.server"]
