# Use Python 3.10 slim image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies
# tshark: required for pyshark
# graphviz: required for blockchain visualization
# git: often useful
RUN apt-get update && apt-get install -y \
    tshark \
    graphviz \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p uploads data

# Expose the port expected by Hugging Face Spaces
EXPOSE 7860

# Command to run the FastAPI application
# Using host 0.0.0.0 to be accessible externally
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
