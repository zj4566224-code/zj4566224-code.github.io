import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 重要:导入 models 触发表注册,以便 Alembic / metadata 看到所有表
import models  # noqa: F401
from routers import (
    accounts,
    ai,
    analysis,
    assets,
    auth,
    budgets,
    categories,
    families,
    goals,
    imports,
    liabilities,
    transactions,
)

app = FastAPI(
    title="FinWise API",
    description="个人财务管理系统后端",
    version="1.0.0",
)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/auth", tags=["认证"])
app.include_router(accounts.router, prefix="/accounts", tags=["账户"])
app.include_router(categories.router, prefix="/categories", tags=["分类"])
app.include_router(transactions.router, prefix="/transactions", tags=["收支记录"])
app.include_router(budgets.router, prefix="/budgets", tags=["预算"])
app.include_router(assets.router, prefix="/assets", tags=["资产"])
app.include_router(assets.networth_router, tags=["资产"])  # /net-worth
app.include_router(liabilities.router, prefix="/liabilities", tags=["负债"])
app.include_router(goals.router, prefix="/goals", tags=["目标"])
app.include_router(analysis.router, prefix="/analysis", tags=["分析"])
app.include_router(families.router, prefix="/families", tags=["家庭"])
app.include_router(families.invitations_router, prefix="/invitations", tags=["家庭"])
app.include_router(imports.router, tags=["导入"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])


@app.get("/")
def root():
    return {"message": "FinWise API 运行中", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
