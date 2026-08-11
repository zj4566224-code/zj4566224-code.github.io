"""微信 / 支付宝账单 CSV 解析。

两家都是先一段中文说明 + 表头,再才是数据行。需要:
1. 自动检测编码(支付宝多为 GBK,微信通常 UTF-8)
2. 定位表头行(找到包含"交易时间"/"付款时间"的行)
3. 字段映射成统一结构
"""
from __future__ import annotations

import csv
import hashlib
import io
import re
from dataclasses import dataclass
from datetime import date as DateType, datetime
from decimal import Decimal, InvalidOperation
from typing import Literal


Source = Literal["alipay", "wechat"]


@dataclass
class ParsedBillRow:
    """统一中间结构。Source-agnostic。"""

    raw_date: str
    date: DateType
    counterparty: str
    note: str
    amount: Decimal
    type: Literal["income", "expense", "transfer"]
    is_internal_transfer: bool  # 零钱←→余额宝 / 支付宝←→银行卡 这种,默认不导入
    fingerprint: str             # 去重哈希

    def to_dict(self) -> dict:
        return {
            "date": self.date.isoformat(),
            "counterparty": self.counterparty,
            "note": self.note,
            "amount": float(self.amount),
            "type": self.type,
            "is_internal_transfer": self.is_internal_transfer,
            "fingerprint": self.fingerprint,
        }


def _decode_bytes(data: bytes) -> str:
    """尝试 UTF-8 → GBK,常见两种编码都覆盖。"""
    for enc in ("utf-8-sig", "utf-8", "gbk", "gb18030"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def _xlsx_to_csv_text(data: bytes) -> str:
    """xlsx → CSV 字符串,以便走和 CSV 一样的解析逻辑。"""
    import openpyxl  # 懒导入,只在确认是 xlsx 时再加载

    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    ws = wb.active
    out = io.StringIO()
    writer = csv.writer(out)
    for row in ws.iter_rows(values_only=True):
        cells = []
        for v in row:
            if v is None:
                cells.append("")
            elif hasattr(v, "strftime"):  # datetime / date
                cells.append(v.strftime("%Y-%m-%d %H:%M:%S"))
            else:
                cells.append(str(v))
        writer.writerow(cells)
    return out.getvalue()


def _normalize_to_text(data: bytes) -> str:
    """xlsx (zip magic 'PK') 走 openpyxl,其余按 CSV 文本解码。"""
    if len(data) >= 2 and data[:2] == b"PK":
        return _xlsx_to_csv_text(data)
    return _decode_bytes(data)


def _make_fingerprint(date: DateType, amount: Decimal, counterparty: str) -> str:
    raw = f"{date.isoformat()}|{amount}|{counterparty}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:16]


def _parse_amount(s: str) -> Decimal | None:
    """'¥35.00' / '-35.00' / '35.00' 都接受。"""
    if not s:
        return None
    cleaned = re.sub(r"[¥￥,\s]", "", s.strip())
    cleaned = cleaned.lstrip("-")
    try:
        v = Decimal(cleaned)
        return v if v > 0 else None
    except InvalidOperation:
        return None


def _parse_date(s: str) -> DateType | None:
    s = s.strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _find_header_row(text: str, expected_columns: list[str]) -> tuple[int, list[str]]:
    """在 CSV 文本中找到包含表头的行号。"""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        cells = [c.strip() for c in next(csv.reader([line])) if c.strip()] if line else []
        if any(col in cells for col in expected_columns):
            return i, cells
    raise ValueError("未能识别账单表头,请确认文件格式正确")


# ──────────────────────────────────────────────────────────
# 支付宝
# ──────────────────────────────────────────────────────────
ALIPAY_INTERNAL_KEYWORDS = (
    "余额宝", "余利宝", "蚂蚁财富", "充值-", "提现-", "银行卡转入", "银行卡转出",
    "转入到余额", "转出至余额", "转账到银行卡", "信用卡还款", "蚂蚁基金",
)


def parse_alipay(data: bytes) -> list[ParsedBillRow]:
    text = _normalize_to_text(data)
    header_idx, header_cells = _find_header_row(text, ["交易创建时间", "付款时间", "交易时间"])
    rest = "\n".join(text.splitlines()[header_idx:])
    reader = csv.DictReader(io.StringIO(rest))

    rows: list[ParsedBillRow] = []
    for raw in reader:
        if not raw:
            continue
        # 兼容空行
        if not any((raw.get(k) or "").strip() for k in raw):
            continue

        # 字段查找:不同时期的支付宝导出列名稍有变化
        date_str = (
            raw.get("付款时间")
            or raw.get("交易创建时间")
            or raw.get("交易时间")
            or ""
        ).strip()
        d = _parse_date(date_str)
        if not d:
            continue

        amt = _parse_amount(raw.get("金额(元)") or raw.get("金额") or "")
        if not amt:
            continue

        flow = (raw.get("收/支") or raw.get("收/付") or "").strip()
        # "支出" / "收入" / "" 或 "其他"(转账之类)
        if flow == "支出":
            ttype: Literal["income", "expense", "transfer"] = "expense"
        elif flow == "收入":
            ttype = "income"
        else:
            ttype = "transfer"

        counterparty = (raw.get("交易对方") or "").strip()
        goods = (raw.get("商品名称") or raw.get("商品") or "").strip()
        note_parts = [s for s in (goods, raw.get("备注", "").strip()) if s]
        note = " · ".join(note_parts)

        text_for_match = f"{counterparty} {goods}"
        is_internal = ttype == "transfer" or any(k in text_for_match for k in ALIPAY_INTERNAL_KEYWORDS)

        rows.append(
            ParsedBillRow(
                raw_date=date_str,
                date=d,
                counterparty=counterparty,
                note=note,
                amount=amt,
                type=ttype,
                is_internal_transfer=is_internal,
                fingerprint=_make_fingerprint(d, amt, counterparty),
            )
        )
    return rows


# ──────────────────────────────────────────────────────────
# 微信
# ──────────────────────────────────────────────────────────
WECHAT_INTERNAL_KEYWORDS = (
    "零钱通", "零钱充值", "零钱提现", "理财通", "银行卡转入", "银行卡转出",
    "信用卡还款", "微信红包-退款", "微粒贷",
)


def parse_wechat(data: bytes) -> list[ParsedBillRow]:
    text = _normalize_to_text(data)
    header_idx, _ = _find_header_row(text, ["交易时间"])
    rest = "\n".join(text.splitlines()[header_idx:])
    reader = csv.DictReader(io.StringIO(rest))

    rows: list[ParsedBillRow] = []
    for raw in reader:
        if not raw or not any((raw.get(k) or "").strip() for k in raw):
            continue
        date_str = (raw.get("交易时间") or "").strip()
        d = _parse_date(date_str)
        if not d:
            continue
        amt = _parse_amount(raw.get("金额(元)") or raw.get("金额") or "")
        if not amt:
            continue

        flow = (raw.get("收/支") or "").strip()
        if flow == "支出":
            ttype: Literal["income", "expense", "transfer"] = "expense"
        elif flow == "收入":
            ttype = "income"
        else:
            ttype = "transfer"

        counterparty = (raw.get("交易对方") or "").strip()
        goods = (raw.get("商品") or "").strip()
        ttype_label = (raw.get("交易类型") or "").strip()
        note_parts = [s for s in (ttype_label, goods, (raw.get("备注") or "").strip().strip("/").strip()) if s]
        note = " · ".join(note_parts)

        text_for_match = f"{counterparty} {goods} {ttype_label}"
        is_internal = ttype == "transfer" or any(k in text_for_match for k in WECHAT_INTERNAL_KEYWORDS)

        rows.append(
            ParsedBillRow(
                raw_date=date_str,
                date=d,
                counterparty=counterparty,
                note=note,
                amount=amt,
                type=ttype,
                is_internal_transfer=is_internal,
                fingerprint=_make_fingerprint(d, amt, counterparty),
            )
        )
    return rows


# ──────────────────────────────────────────────────────────
# 关键词 → 分类自动归类
# ──────────────────────────────────────────────────────────
CATEGORY_RULES: dict[str, tuple[str, ...]] = {
    "餐饮": (
        "美团", "饿了么", "麦当劳", "肯德基", "KFC", "星巴克", "Starbucks", "瑞幸", "luckin",
        "喜茶", "蜜雪冰城", "奈雪", "海底捞", "外卖", "餐厅", "饮品", "烧烤", "火锅", "便利店",
        "7-eleven", "全家", "罗森", "DQ", "Coco", "肯德基", "Pizza", "披萨", "汉堡",
    ),
    "交通": (
        "12306", "铁路", "高铁", "地铁", "公交", "滴滴", "didi", "uber", "Uber", "高德", "曹操出行",
        "T3出行", "首汽", "出租", "网约车", "加油", "中石油", "中石化", "停车", "ETC",
        "携程交通", "去哪儿机票",
    ),
    "购物": (
        "淘宝", "天猫", "京东", "拼多多", "唯品会", "苏宁", "国美", "抖音电商", "小红书",
        "网易严选", "得物", "Apple", "苹果", "1688",
    ),
    "娱乐": (
        "B站", "bilibili", "哔哩哔哩", "爱奇艺", "腾讯视频", "优酷", "芒果TV", "网易云", "QQ音乐",
        "Spotify", "Netflix", "Steam", "PSN", "游戏", "App Store", "电影", "万达影城", "CGV", "票务",
    ),
    "住房": (
        "房租", "水费", "电费", "燃气", "物业", "宽带", "中国联通", "中国移动", "中国电信", "话费",
    ),
    "医疗": (
        "医院", "药店", "诊所", "挂号", "京东健康", "阿里健康", "丁香",
    ),
    "工资": (
        "工资", "薪资", "薪水", "代发",
    ),
}


def auto_category(counterparty: str, note: str, user_categories: dict[str, int]) -> int | None:
    """根据关键词推断分类。user_categories 是 {name: id} 映射(限当前用户)。
    匹配不上返回 None,让前端展示"未分类"。"""
    text = f"{counterparty} {note}".lower()
    for cat_name, keywords in CATEGORY_RULES.items():
        if cat_name not in user_categories:
            continue
        for kw in keywords:
            if kw.lower() in text:
                return user_categories[cat_name]
    return None
