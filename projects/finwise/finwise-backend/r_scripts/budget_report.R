library(jsonlite)

# 输入: input_data$amount (向量), input_data$spent (向量), input_data$names (向量)
# 输出: 每个分类的使用率 + 总体超支项数

budget_report <- function(data) {
  amount <- as.numeric(data$amount)
  spent <- as.numeric(data$spent)
  names_ <- as.character(data$names)

  if (length(amount) == 0) {
    return(list(items = list(), overspent_count = 0))
  }

  usage <- ifelse(amount > 0, spent / amount, 0)
  overspent <- amount > 0 & spent > amount

  items <- lapply(seq_along(amount), function(i) {
    list(
      name = names_[i],
      amount = amount[i],
      spent = spent[i],
      usage_rate = round(usage[i], 4),
      overspent = unname(overspent[i])
    )
  })

  list(
    items = items,
    overspent_count = sum(overspent)
  )
}

result_list <- budget_report(input_data)
result <- toJSON(result_list, auto_unbox = TRUE)
