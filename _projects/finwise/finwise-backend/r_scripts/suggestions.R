library(jsonlite)

generate_suggestions <- function(data) {
  suggestions <- list()

  savings_rate <- as.numeric(data$savings_rate)
  avg_goal_progress <- as.numeric(data$avg_goal_progress)
  debt_ratio <- as.numeric(data$debt_ratio)
  overspent_category <- if (!is.null(data$overspent_category)) as.character(data$overspent_category) else ""

  # 储蓄率
  if (savings_rate < 0.2) {
    suggestions[[length(suggestions) + 1]] <- list(
      level = "warn",
      text = paste0("本月储蓄率仅 ", round(savings_rate * 100), "%,",
                    "低于建议的 20%,请检查非必要支出。")
    )
  } else {
    suggestions[[length(suggestions) + 1]] <- list(
      level = "ok",
      text = paste0("储蓄率达 ", round(savings_rate * 100), "%,",
                    "高于建议的 20%,财务状况良好。")
    )
  }

  # 超支
  if (nchar(overspent_category) > 0 && overspent_category != "NA") {
    suggestions[[length(suggestions) + 1]] <- list(
      level = "warn",
      text = paste0(overspent_category, " 支出已超出预算,请注意控制该分类消费。")
    )
  }

  # 目标进度
  if (avg_goal_progress < 0.5) {
    suggestions[[length(suggestions) + 1]] <- list(
      level = "tip",
      text = "当前目标完成进度偏低,建议增加每月存入金额。"
    )
  }

  # 负债率
  if (debt_ratio > 0.5) {
    suggestions[[length(suggestions) + 1]] <- list(
      level = "warn",
      text = paste0("负债占资产比已达 ", round(debt_ratio * 100), "%,建议优先偿还高息负债。")
    )
  } else if (debt_ratio < 0.1) {
    suggestions[[length(suggestions) + 1]] <- list(
      level = "tip",
      text = "负债水平健康,可考虑将闲余资金配置到投资或储蓄目标。"
    )
  }

  suggestions
}

result_list <- generate_suggestions(input_data)
result <- toJSON(result_list, auto_unbox = TRUE)
