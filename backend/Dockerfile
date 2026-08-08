FROM python:3.12-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend
COPY . .

EXPOSE 8000

# Seed demo data on first boot (no-ops if data already exists), then start the
# API with auto-reload so code changes on the mounted volume take effect.
CMD ["sh", "-c", "python seed_demo_data.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
