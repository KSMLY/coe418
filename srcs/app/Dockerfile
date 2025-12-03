FROM python:3.11-slim

WORKDIR /app
RUN mkdir -p /app/uploads/profiles
RUN mkdir -p /app/uploads/achievements

# Copy requirements and install dependencies
COPY conf/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code from src directory
COPY src/ ./

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]