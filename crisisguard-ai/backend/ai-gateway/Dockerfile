FROM python:3.12-slim
WORKDIR /app
RUN addgroup --gid 1001 crisisguard && \
    adduser --uid 1001 --gid 1001 --disabled-password crisisguard
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import httpx; r = httpx.get('http://localhost:8001/health'); assert r.status_code == 200"
USER crisisguard
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
