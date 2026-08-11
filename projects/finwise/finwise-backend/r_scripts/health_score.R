library(jsonlite)

calculate_score <- function(data) {
  savings_rate <- as.numeric(data$savings_rate)
  budget_overspent <- as.numeric(data$budget_overspent)
  budget_usage_rate <- as.numeric(data$budget_usage_rate)
  debt_ratio <- as.numeric(data$debt_ratio)
  avg_goal_progress <- as.numeric(data$avg_goal_progress)

  # 储蓄率得分 (>= 30% 满分)
  savings_score <- min(100, max(0, round(savings_rate * 300)))

  # 预算控制得分
  if (budget_overspent > 0) {
    budget_score <- max(0, round(100 - budget_overspent * 20))
  } else {
    budget_score <- min(100, max(0, round(100 - abs(budget_usage_rate - 0.8) * 50)))
  }

  # 负债率得分 (债务 / 资产 < 30% 满分)
  debt_score <- min(100, max(0, round((1 - min(1, debt_ratio / 0.3)) * 100)))

  # 目标进度得分
  goal_score <- min(100, max(0, round(avg_goal_progress * 100)))

  total <- round((savings_score + budget_score + debt_score + goal_score) / 4)

  list(
    total = total,
    savings_rate = savings_score,
    budget_control = budget_score,
    debt_ratio = debt_score,
    goal_progress = goal_score
  )
}

scores <- calculate_score(input_data)
result <- toJSON(scores, auto_unbox = TRUE)
