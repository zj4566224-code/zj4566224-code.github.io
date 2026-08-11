library(jsonlite)

trend_summary <- function(data) {
  income <- as.numeric(data$income)
  expense <- as.numeric(data$expense)
  savings <- income - expense
  n <- length(income)

  if (n < 2) {
    return(list(
      avg_income = mean(income),
      avg_expense = mean(expense),
      avg_savings = mean(savings),
      income_trend = 0,
      expense_trend = 0
    ))
  }

  x <- 1:n
  income_slope <- coef(lm(income ~ x))[2]
  expense_slope <- coef(lm(expense ~ x))[2]

  list(
    avg_income = round(mean(income), 2),
    avg_expense = round(mean(expense), 2),
    avg_savings = round(mean(savings), 2),
    income_trend = round(income_slope, 2),
    expense_trend = round(expense_slope, 2)
  )
}

result_list <- trend_summary(input_data)
result <- toJSON(result_list, auto_unbox = TRUE)
