FROM python:3.11-slim

# 安装 R 与编译依赖
# r-base-dev: rpy2 编译时需要 libR.so + R 头文件
# build-essential: make / g++ 等(slim 镜像不自带)
# pkg-config + libffi-dev: cffi 子依赖编译需要
RUN apt-get update && apt-get install -y --no-install-recommends \
    r-base \
    r-base-dev \
    r-cran-jsonlite \
    build-essential \
    gcc \
    pkg-config \
    libffi-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 兜底安装 R 包
RUN Rscript -e "if (!requireNamespace('jsonlite', quietly=TRUE)) install.packages('jsonlite', repos='https://cran.rstudio.com/')"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
