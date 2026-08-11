"""R 调用封装。R 脚本失败时降级到 Python 计算,不让接口报错。"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

R_SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "r_scripts"

# 延迟导入 rpy2 以便环境不支持时可降级
try:
    import rpy2.robjects as ro  # type: ignore

    _RPY2_AVAILABLE = True
except Exception as e:  # pragma: no cover
    ro = None  # type: ignore
    _RPY2_AVAILABLE = False
    logger.warning("rpy2 不可用,R 分析将走降级路径: %s", e)


def _to_r_value(value: Any):
    """递归将 Python 值转换为 R 对象。"""
    if value is None:
        return ro.NULL  # type: ignore[union-attr]
    if isinstance(value, bool):
        return ro.BoolVector([value])  # type: ignore[union-attr]
    if isinstance(value, (int, float)):
        return ro.FloatVector([float(value)])  # type: ignore[union-attr]
    if isinstance(value, str):
        return ro.StrVector([value])  # type: ignore[union-attr]
    if isinstance(value, list):
        if not value:
            return ro.FloatVector([])  # type: ignore[union-attr]
        if all(isinstance(v, (int, float)) for v in value):
            return ro.FloatVector([float(v) for v in value])  # type: ignore[union-attr]
        if all(isinstance(v, str) for v in value):
            return ro.StrVector(list(value))  # type: ignore[union-attr]
    if isinstance(value, dict):
        return ro.ListVector({k: _to_r_value(v) for k, v in value.items()})  # type: ignore[union-attr]
    return ro.StrVector([str(value)])  # type: ignore[union-attr]


def run_r_script(script_name: str, data: dict) -> Any:
    """运行 r_scripts/<script_name>,将 data 作为 input_data 注入,期望脚本写入 `result` JSON 字符串。"""
    if not _RPY2_AVAILABLE:
        return None

    script_path = R_SCRIPTS_DIR / script_name
    if not script_path.exists():
        logger.warning("R 脚本不存在: %s", script_path)
        return None

    try:
        ro.globalenv["input_data"] = _to_r_value(data)  # type: ignore[union-attr]
        with script_path.open("r", encoding="utf-8") as f:
            ro.r(f.read())  # type: ignore[union-attr]
        raw = ro.globalenv["result"][0]  # type: ignore[union-attr]
        return json.loads(raw)
    except Exception as e:
        logger.exception("R 脚本执行失败 %s: %s", script_name, e)
        return None
